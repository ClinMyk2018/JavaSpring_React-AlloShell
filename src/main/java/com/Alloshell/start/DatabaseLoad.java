package com.Alloshell.start;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseLoad implements CommandLineRunner {

	private final EmpRepo emps;
	private final ManagerRepo managers;

	@Autowired
	public DatabaseLoad(EmpRepo empRepository,
						  ManagerRepo managerRepository) {

		this.emps = empRepository;
		this.managers = managerRepository;
	}

	@Override
	public void run(String... strings) throws Exception {

		Manager rom = this.managers.save(new Manager("rom", "sand",
							"ROLE_MANAGER"));
		Manager bran = this.managers.save(new Manager("bran", "dandy",
							"ROLE_MANAGER"));
		Manager andy = this.managers.save(new Manager("andy", "randy",
				"ROLE_MANAGER"));
		Manager chris = this.managers.save(new Manager("chris", "euro",
				"ROLE_MANAGER"));

		SecurityContextHolder.getContext().setAuthentication(
			new UsernamePasswordAuthenticationToken("rom", "doesn't matter",
				AuthorityUtils.createAuthorityList("ROLE_MANAGER")));

		this.emps.save(new Emp("Intern", "1", "Meeting Guy", rom));
		this.emps.save(new Emp("Intern", "2", "Meeting Girl", rom));

		SecurityContextHolder.getContext().setAuthentication(
			new UsernamePasswordAuthenticationToken("bran", "doesn't matter",
				AuthorityUtils.createAuthorityList("ROLE_MANAGER")));

		this.emps.save(new Emp("Intern", "3", "Meeting Guy", bran));
		this.emps.save(new Emp("Intern", "4", "Meeting Girl", bran));
		
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("andy", "doesn't matter",
					AuthorityUtils.createAuthorityList("ROLE_MANAGER")));

			this.emps.save(new Emp("Intern", "5", "Meeting Guy", andy));
			this.emps.save(new Emp("Intern", "6", "Meeting Girl", andy));

		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("chris", "doesn't matter",
					AuthorityUtils.createAuthorityList("ROLE_MANAGER")));
		
			this.emps.save(new Emp("Intern", "7", "Meeting Guy", chris));
			this.emps.save(new Emp("Intern", "8", "Meeting Girl", chris));
			
			

		SecurityContextHolder.clearContext();
	}

}
