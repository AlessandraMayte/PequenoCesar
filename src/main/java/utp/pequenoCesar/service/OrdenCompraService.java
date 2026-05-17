package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import utp.pequenoCesar.dto.request.OrdenCompraInsumoRequest;
import utp.pequenoCesar.dto.request.OrdenCompraRequest;
import utp.pequenoCesar.dto.response.InventarioResponse;
import utp.pequenoCesar.dto.response.OrdenCompraResponse;
import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.entity.OrdenCompra;
import utp.pequenoCesar.entity.OrdenCompraInsumo;
import utp.pequenoCesar.entity.Proveedor;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.EmpleadoRepository;
import utp.pequenoCesar.repository.InventarioRepository;
import utp.pequenoCesar.repository.OrdenCompraRepository;
import utp.pequenoCesar.repository.ProveedorRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrdenCompraService {

    private static final String ACTIVE_STATUS = "Activo";

    private final OrdenCompraRepository ordenCompraRepository;
    private final ProveedorRepository proveedorRepository;
    private final EmpleadoRepository empleadoRepository;
    private final InventarioRepository inventarioRepository;
    private final InventarioService inventarioService;

    @Transactional(readOnly = true)
    public List<OrdenCompraResponse> findAll() {
        return ordenCompraRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrdenCompraResponse findById(UUID id) {
        return ordenCompraRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada"));
    }

    @Transactional(readOnly = true)
    public List<OrdenCompraResponse> findByFechaBetween(LocalDate inicio, LocalDate fin) {
        return ordenCompraRepository.findByFechaBetween(inicio, fin).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<OrdenCompraResponse> findSugeridas() {
        List<InventarioResponse> stockBajo = inventarioService.findByStockBajo();
        return stockBajo.stream()
                .map(i -> OrdenCompraResponse.builder()
                        .idOrden(null)
                        .fecha(LocalDate.now())
                        .estado("sugerido")
                        .detalleInsumos("Sugerido: " + i.getNombreInsumo() + " - Stock actual: " + i.getStockActual() + " " + i.getUnidad())
                        .nombreProveedor(null)
                        .build())
                .toList();
    }

    @Transactional
    public OrdenCompraResponse save(OrdenCompraRequest request) {
        Proveedor proveedor = proveedorRepository.findById(request.getIdProveedor())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));

        Empleado empleado = null;
        if (request.getIdEmpleado() != null) {
            empleado = empleadoRepository.findById(request.getIdEmpleado())
                    .orElse(null);
        }

        OrdenCompra orden = OrdenCompra.builder()
                .fecha(LocalDate.now())
                .estado("pendiente")
                .proveedor(proveedor)
                .empleado(empleado)
                .build();
        setInsumos(orden, request.getInsumos());

        return toResponse(ordenCompraRepository.save(orden));
    }

    @Transactional
    public OrdenCompraResponse update(UUID id, OrdenCompraRequest request) {
        OrdenCompra orden = ordenCompraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada"));
        if (!"pendiente".equalsIgnoreCase(orden.getEstado())) {
            throw new BadRequestException("Solo se pueden modificar ordenes pendientes");
        }

        Proveedor proveedor = proveedorRepository.findById(request.getIdProveedor())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        orden.setProveedor(proveedor);
        orden.getInsumos().clear();
        setInsumos(orden, request.getInsumos());

        return toResponse(ordenCompraRepository.save(orden));
    }

    @Transactional
    public OrdenCompraResponse recibirOrden(UUID id) {
        OrdenCompra orden = ordenCompraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada"));

        if (!"enviada".equals(orden.getEstado()) && !"pendiente".equals(orden.getEstado())) {
            throw new BadRequestException("La orden debe estar en estado 'pendiente' o 'enviada' para ser recibida");
        }

        if (orden.getInsumos().isEmpty()) {
            throw new BadRequestException("El detalle de insumos no contiene elementos válidos");
        }

        orden.getInsumos().forEach(item -> inventarioService.agregarStock(item.getInventario().getIdInsumo(), item.getCantidad()));
        orden.setEstado("recibida");
        return toResponse(ordenCompraRepository.save(orden));
    }

    public void delete(UUID id) {
        ordenCompraRepository.deleteById(id);
    }

    private void setInsumos(OrdenCompra orden, List<OrdenCompraInsumoRequest> insumosRequest) {
        for (OrdenCompraInsumoRequest insumoRequest : insumosRequest) {
            Inventario inventario = inventarioRepository.findById(insumoRequest.getIdInsumo())
                    .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));
            if (!ACTIVE_STATUS.equalsIgnoreCase(inventario.getEstado())) {
                throw new BadRequestException("No puede solicitar un insumo inactivo: " + inventario.getNombreInsumo());
            }

            OrdenCompraInsumo insumo = OrdenCompraInsumo.builder()
                    .ordenCompra(orden)
                    .inventario(inventario)
                    .cantidad(insumoRequest.getCantidad())
                    .build();
            orden.getInsumos().add(insumo);
        }
    }

    private OrdenCompraResponse toResponse(OrdenCompra orden) {
        return OrdenCompraResponse.builder()
                .idOrden(orden.getIdOrden())
                .fecha(orden.getFecha())
                .estado(orden.getEstado())
                .detalleInsumos(buildDetalleInsumos(orden))
                .idProveedor(orden.getProveedor() == null ? null : orden.getProveedor().getIdProveedor())
                .nombreProveedor(orden.getProveedor() == null ? null : orden.getProveedor().getNombre())
                .rucProveedor(orden.getProveedor() == null ? null : orden.getProveedor().getRuc())
                .telefonoProveedor(orden.getProveedor() == null ? null : orden.getProveedor().getTelefono())
                .insumos(orden.getInsumos().stream()
                        .map(item -> OrdenCompraResponse.OrdenCompraInsumoResponse.builder()
                                .idInsumo(item.getInventario().getIdInsumo())
                                .nombreInsumo(item.getInventario().getNombreInsumo())
                                .unidad(item.getInventario().getUnidad())
                                .cantidad(item.getCantidad())
                                .build())
                        .toList())
                .build();
    }

    private String buildDetalleInsumos(OrdenCompra orden) {
        return orden.getInsumos().stream()
                .map(item -> item.getInventario().getNombreInsumo() + " " + item.getCantidad() + " " + item.getInventario().getUnidad())
                .collect(Collectors.joining(", "));
    }
}
