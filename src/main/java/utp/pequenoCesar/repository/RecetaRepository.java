package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import utp.pequenoCesar.entity.Receta;

import java.util.UUID;

@Repository
public interface RecetaRepository extends JpaRepository<Receta, UUID> {
}
