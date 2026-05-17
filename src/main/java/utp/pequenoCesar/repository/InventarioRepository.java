package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import utp.pequenoCesar.entity.Inventario;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, UUID> {

    @Query("SELECT i FROM Inventario i WHERE i.stockActual <= i.stockMinimo")
    List<Inventario> findByStockBajo();

    @Query("SELECT i FROM Inventario i WHERE i.fechaCaducidad <= :fechaLimite")
    List<Inventario> findByFechaCaducidadProxima(@Param("fechaLimite") LocalDate fechaLimite);

    @Query("SELECT i FROM Inventario i WHERE i.stockActual <= i.stockMinimo OR i.fechaCaducidad <= :fechaLimite")
    List<Inventario> findInsumosConProblemas(@Param("fechaLimite") LocalDate fechaLimite);
}