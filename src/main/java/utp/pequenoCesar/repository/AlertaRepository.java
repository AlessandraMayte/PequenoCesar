package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import utp.pequenoCesar.entity.Alerta;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertaRepository extends JpaRepository<Alerta, UUID> {

    List<Alerta> findByEstado(String estado);

    List<Alerta> findAllByOrderByFechaHoraDesc();

    List<Alerta> findByEstadoOrderByFechaHoraDesc(String estado);

    List<Alerta> findByInventarioIdInsumo(UUID idInsumo);

    List<Alerta> findByInventarioIdInsumoAndTipoAndEstado(UUID idInsumo, String tipo, String estado);

    boolean existsByInventarioIdInsumoAndTipoAndEstado(UUID idInsumo, String tipo, String estado);
}
