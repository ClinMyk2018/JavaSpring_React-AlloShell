const React = require('react');
const ReactDOM = require('react-dom');
const client = require('./client');
const when = require('when');
const follow = require('./follow');
const stompClient = require('./websocket-listner')

const root = '/api';

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {emps: [], attributes: [], page: 1, pageSize: 4, links: {}
		   , loggedInManager: this.props.loggedInManager};
		this.updatePageSize = this.updatePageSize.bind(this);
		this.onCreate = this.onCreate.bind(this);
		this.onUpdate = this.onUpdate.bind(this);
		this.onDelete = this.onDelete.bind(this);
		this.onNavigate = this.onNavigate.bind(this);
		this.refreshCurrentPage = this.refreshCurrentPage.bind(this);
		this.refreshAndGoToLastPage = this.refreshAndGoToLastPage.bind(this);
	}

	loadFromServer(pageSize) {
		follow(client, root, [
				{rel: 'emps', params: {size: pageSize}}]
		).then(empCollection => {
			return client({
				method: 'GET',
				path: empCollection.entity._links.profile.href,
				headers: {'Accept': 'application/schema+json'}
			}).then(schema => {
			
			Object.keys(schema.entity.properties).forEach(function (property) {
					if (schema.entity.properties[property].hasOwnProperty('format') &&
						schema.entity.properties[property].format === 'uri') {
						delete schema.entity.properties[property];
					}
					else if (schema.entity.properties[property].hasOwnProperty('$ref')) {
						delete schema.entity.properties[property];
					}
				});

				this.schema = schema.entity;
				this.links = empCollection.entity._links;
				return empCollection;
				// end::json-schema-filter[]
			});
		}).then(empCollection => {
			this.page = empCollection.entity.page;
			return empCollection.entity._embedded.emps.map(emp =>
					client({
						method: 'GET',
						path: emp._links.self.href
					})
			);
		}).then(empPromises => {
			return when.all(empPromises);
		}).done(emps => {
			this.setState({
				page: this.page,
				emps: emps,
				attributes: Object.keys(this.schema.properties),
				pageSize: pageSize,
				links: this.links
			});
		});
	}

	// tag::on-create[]
	onCreate(newEmp) {
		follow(client, root, ['emps']).done(response => {
			client({
				method: 'POST',
				path: response.entity._links.self.href,
				entity: newEmp,
				headers: {'Content-Type': 'application/json'}
			})
		})
	}
	// end::on-create[]

	onUpdate(emp, updatedEmp) {
		if(emp.entity.manager.name === this.state.loggedInManager) {
			updatedEmp["manager"] = emp.entity.manager;
			client({
				method: 'PUT',
				path: emp.entity._links.self.href,
				entity: updatedEmp,
				headers: {
					'Content-Type': 'application/json',
					'If-Match': emp.headers.Etag
				}
			}).done(response => {
				/* Let the websocket handler update the state */
			}, response => {
				if (response.status.code === 403) {
					alert('ACCESS DENIED: You are not authorized to update ' +
						emp.entity._links.self.href);
				}
				if (response.status.code === 412) {
					alert('DENIED: Unable to update ' + emp.entity._links.self.href +
						'. Your copy is stale.');
				}
			});
		} else {
			alert("You are not authorized to update");
		}
	}

	onDelete(emp) {
		client({method: 'DELETE', path: emp.entity._links.self.href}
		).done(response => {/* let the websocket handle updating the UI */},
		response => {
			if (response.status.code === 403) {
				alert('ACCESS DENIED: You are not authorized to delete ' +
					emp.entity._links.self.href);
			}
		});
	}

	onNavigate(navUri) {
		client({
			method: 'GET',
			path: navUri
		}).then(empCollection => {
			this.links = empCollection.entity._links;
			this.page = empCollection.entity.page;

			return empCollection.entity._embedded.emps.map(emp =>
					client({
						method: 'GET',
						path: emp._links.self.href
					})
			);
		}).then(empPromises => {
			return when.all(empPromises);
		}).done(emps => {
			this.setState({
				page: this.page,
				emps: emps,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}

	updatePageSize(pageSize) {
		if (pageSize !== this.state.pageSize) {
			this.loadFromServer(pageSize);
		}
	}

	refreshAndGoToLastPage(message) {
		follow(client, root, [{
			rel: 'emps',
			params: { size: this.state.pageSize }
		}]).done(response => {
			if (response.entity._links.last !== undefined) {
				this.onNavigate(response.entity._links.last.href);
			} else {
				this.onNavigate(response.entity._links.self.href);
			}
		})
	}

	refreshCurrentPage(message) {
		follow(client, root, [{
			rel: 'emps',
			params: {
				size: this.state.pageSize,
				page: this.state.page.number
			}
		}]).then(empCollection => {
			this.links = empCollection.entity._links;
			this.page = empCollection.entity.page;

			return empCollection.entity._embedded.emps.map(emp => {
				return client({
					method: 'GET',
					path: emp._links.self.href
				})
			});
		}).then(empPromises => {
			return when.all(empPromises);
		}).then(emps => {
			this.setState({
				page: this.page,
				emps: emps,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}

	componentDidMount() {
		this.loadFromServer(this.state.pageSize);
		stompClient.register([
			{ route: '/CustomizeEmployee/newEmp', callback: this.refreshAndGoToLastPage },
			{ route: '/CustomizeEmployee/updateEmp', callback: this.refreshCurrentPage },
			{ route: '/CustomizeEmployee/deleteEmp', callback: this.refreshCurrentPage }
		]);
	}


	render() {
		return (
			<div>
				<CreateDialog attributes={this.state.attributes} onCreate={this.onCreate} />
				<EmpList page={this.state.page}
					emps={this.state.emps}
					links={this.state.links}
					pageSize={this.state.pageSize}
					attributes={this.state.attributes}
					onNavigate={this.onNavigate}
					onUpdate={this.onUpdate}
					onDelete={this.onDelete}
					updatePageSize={this.updatePageSize}
					loggedInManager={this.state.loggedInManager} />
			</div>
		)
	}

}

class CreateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const newEmp = {};
		this.props.attributes.forEach(attribute => {
			newEmp[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onCreate(newEmp);

		// clear out the dialog's inputs
		this.props.attributes.forEach(attribute => {
			ReactDOM.findDOMNode(this.refs[attribute]).value = '';
		});

		// Navigate away from the dialog to hide it.
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={attribute}>
				<input type="text" placeholder={attribute} ref={attribute} className="field" />
			</p>
		);

		return (
			<div>
				<a id="createButton" href="#createEmp">Create</a> 

				<div id="createEmp" className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Create New Employee</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Create</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

}

class UpdateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const updatedEmp = {};
		this.props.attributes.forEach(attribute => {
			updatedEmp[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onUpdate(this.props.emp, updatedEmp);
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={this.props.emp.entity[attribute]}>
				<input type="text" placeholder={attribute}
					defaultValue={this.props.emp.entity[attribute]}
					ref={attribute} className="field" />
			</p>
		);

		const dialogId = "updatedEmp-" + this.props.emp.entity._links.self.href;

		return (
			<div key={this.props.emp.entity._links.self.href}>
				<a href={"#" + dialogId}>Update</a>
				<div id={dialogId} className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Update An Employee</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Update</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

};

class EmpList extends React.Component {

	constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}

	handleInput(e) {
		e.preventDefault();
		const pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
		if (/^[0-9]+$/.test(pageSize)) {
			this.props.updatePageSize(pageSize);
		} else {
			ReactDOM.findDOMNode(this.refs.pageSize).value =
				pageSize.substring(0, pageSize.length - 1);
		}
	}

	handleNavFirst(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.first.href);
	}

	handleNavPrev(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.prev.href);
	}

	handleNavNext(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.next.href);
	}

	handleNavLast(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.last.href);
	}

	render() {
		const pageInfo = this.props.page.hasOwnProperty("number") ?
			<h3>Employees - Page {this.props.page.number + 1} of {this.props.page.totalPages}</h3> : null;

		const emps = this.props.emps.map(emp =>
			<Emp key={emp.entity._links.self.href}
				emp={emp}
				attributes={this.props.attributes}
				onUpdate={this.props.onUpdate}
				onDelete={this.props.onDelete}
				loggedInManager={this.props.loggedInManager} />
		);

		const navLinks = [];
		if ("first" in this.props.links) {
			navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
		}
		if ("prev" in this.props.links) {
			navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
		}
		if ("next" in this.props.links) {
			navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
		}
		if ("last" in this.props.links) {
			navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
		}

		return (
			<div>
				{pageInfo}
				<input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput} />
				<table>
					<tbody>
						<tr>
							<th>First Name</th>
							<th>Last Name</th>
							<th>Description</th>
							<th>Manager</th>
							<th></th>
							<th></th>
						</tr>
						{emps}
					</tbody>
				</table>
				<div>
					{navLinks}
				</div>
			</div>
		)
	}
}

class Emp extends React.Component {

	constructor(props) {
		super(props);
		this.handleDelete = this.handleDelete.bind(this);
	}

	handleDelete() {
		this.props.onDelete(this.props.emp);
	}

	render() {
		return (
			<tr>
				<td>{this.props.emp.entity.firstName}</td>
				<td>{this.props.emp.entity.lastName}</td>
				<td>{this.props.emp.entity.description}</td>
				<td>{this.props.emp.entity.manager.name}</td>
				<td>
					<UpdateDialog emp={this.props.emp}
						attributes={this.props.attributes}
						onUpdate={this.props.onUpdate}
						loggedInManager={this.props.loggedInManager} />
				</td>
				<td>
					<button onClick={this.handleDelete}>Delete</button>
				</td>
			</tr>
		)
	}
}

ReactDOM.render(
	<App loggedInManager={document.getElementById('managername').innerHTML} />,
	document.getElementById('react')
)
