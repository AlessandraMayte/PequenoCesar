package utp.pequenoCesar.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import utp.pequenoCesar.entity.Pedido;

import java.util.List;
import java.util.UUID;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, UUID> {

    List<Pedido> findByEstado(String estado);

    List<Pedido> findByClienteIdCliente(UUID idCliente);
}