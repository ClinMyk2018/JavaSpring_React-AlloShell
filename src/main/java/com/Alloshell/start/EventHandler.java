package com.Alloshell.start;

import static com.Alloshell.start.WebSocketConfiguration.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.core.annotation.HandleAfterCreate;
import org.springframework.data.rest.core.annotation.HandleAfterDelete;
import org.springframework.data.rest.core.annotation.HandleAfterSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.hateoas.server.EntityLinks;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RepositoryEventHandler(Emp.class)
public class EventHandler {

	private final SimpMessagingTemplate websocket;

	private final EntityLinks entityLinks;

	@Autowired
	public EventHandler(SimpMessagingTemplate websocket, EntityLinks entityLinks) {
		this.websocket = websocket;
		this.entityLinks = entityLinks;
	}

	@HandleAfterCreate 
	public void newUser(Emp emp) {
		this.websocket.convertAndSend(
				MESSAGE_PREFIX + "/newEmp", getPath(emp));
	}

	@HandleAfterDelete 
	public void deleteUser(Emp emp) {
		this.websocket.convertAndSend(
				MESSAGE_PREFIX + "/deleteEmp", getPath(emp));
	}

	@HandleAfterSave 
	public void updateUser(Emp emp) {
		this.websocket.convertAndSend(
				MESSAGE_PREFIX + "/updateEmp", getPath(emp));
	}


	private String getPath(Emp emp) {
		return this.entityLinks.linkForItemResource(emp.getClass(),
				emp.getId()).toUri().getPath();
	}

}