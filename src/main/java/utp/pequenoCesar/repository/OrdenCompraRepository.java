package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import utp.pequenoCesar.entity.OrdenCompra;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrdenCompraRepository extends JpaRepository<OrdenCompra, UUID> {

    @Query("SELECT o FROM OrdenCompra o WHERE o.fecha BETWEEN :fechaInicio AND :fechaFin")
    List<OrdenCompra> findByFechaBetween(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    @Query("SELECT o FROM OrdenCompra o WHERE o.estado = :estado")
    List<OrdenCompra> findByEstado(@Param("estado") String estado);

    List<OrdenCompra> findByProveedorIdProveedor(UUID idProveedor);
}