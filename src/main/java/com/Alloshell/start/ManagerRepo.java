package com.Alloshell.start;

import org.springframework.data.repository.Repository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(exported = false)
public interface ManagerRepo extends Repository<Manager, Long> {

	Manager save(Manager manager);

	Manager findByName(String name);

}
