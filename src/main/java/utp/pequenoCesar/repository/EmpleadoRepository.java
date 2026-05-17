package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import utp.pequenoCesar.entity.Empleado;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, UUID> {

    Optional<Empleado> findByUser(String user);

    boolean existsByUser(String user);
}
