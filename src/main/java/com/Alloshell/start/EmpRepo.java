package com.Alloshell.start;

//import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.security.access.prepost.PreAuthorize;

@PreAuthorize("hasRole('ROLE_MANAGER')")
public interface EmpRepo extends PagingAndSortingRepository<Emp, Long> {
	
	@SuppressWarnings("unchecked")
	@Override
	@PreAuthorize("#emp?.manager == null or #emp?.manager?.name == authentication?.name")
	Emp save(@Param("emp") Emp emp);

	@Override
	@PreAuthorize("@empRepo.findById(#id)?.manager?.name == authentication?.name")
	void deleteById(@Param("id") Long id);

	@Override
	@PreAuthorize("#emp?.manager?.name == authentication?.name")
	void delete(@Param("emp") Emp emp);

}
