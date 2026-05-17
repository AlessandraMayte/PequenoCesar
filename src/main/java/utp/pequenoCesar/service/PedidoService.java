package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import utp.pequenoCesar.dto.request.PedidoRecetaRequest;
import utp.pequenoCesar.dto.request.PedidoRequest;
import utp.pequenoCesar.dto.response.PedidoResponse;
import utp.pequenoCesar.entity.Cliente;
import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.entity.Pedido;
import utp.pequenoCesar.entity.PedidoReceta;
import utp.pequenoCesar.entity.Receta;
import utp.pequenoCesar.entity.RecetaIngrediente;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.ClienteRepository;
import utp.pequenoCesar.repository.EmpleadoRepository;
import utp.pequenoCesar.repository.PedidoRepository;
import utp.pequenoCesar.repository.RecetaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PedidoService {

    private static final String ACTIVE_STATUS = "Activo";
    private static final String DELIVERY = "DELIVERY";

    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;
    private final EmpleadoRepository empleadoRepository;
    private final RecetaRepository recetaRepository;
    private final InventarioService inventarioService;

    @Transactional(readOnly = true)
    public List<PedidoResponse> findAll() {
        return pedidoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PedidoResponse findById(UUID id) {
        return pedidoRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
    }

    @Transactional(readOnly = true)
    public List<PedidoResponse> findByEstado(String estado) {
        return pedidoRepository.findByEstado(estado).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PedidoResponse save(PedidoRequest request) {
        Cliente cliente = clienteRepository.findById(request.getIdCliente())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        String tipoAtencion = request.getTipoAtencion().trim().toUpperCase();
        validarDatosDelivery(cliente, tipoAtencion);

        Empleado empleado = getAuthenticatedEmpleado();

        Pedido pedido = Pedido.builder()
                .fechaHora(LocalDateTime.now())
                .estado("registrado")
                .tipoAtencion(tipoAtencion)
                .cliente(cliente)
                .empleado(empleado)
                .build();

        Map<UUID, BigDecimal> insumos = new HashMap<>();
        BigDecimal total = setRecetas(pedido, request.getRecetas(), insumos);
        pedido.setTotal(total.doubleValue());
        inventarioService.descontarInsumos(insumos);

        return toResponse(pedidoRepository.save(pedido));
    }

    @Transactional
    public PedidoResponse actualizarEstado(UUID id, String nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));

        String estadoActual = pedido.getEstado();
        String estadoNuevo = nuevoEstado.trim().toLowerCase();
        validarEstadoPermitidoPorRol(estadoNuevo);

        boolean transicionValida = validarTransicion(estadoActual, estadoNuevo);
        if (!transicionValida) {
            throw new BadRequestException("Transición de estado inválida: " + estadoActual + " -> " + estadoNuevo);
        }

        pedido.setEstado(estadoNuevo);
        return toResponse(pedidoRepository.save(pedido));
    }

    private void validarEstadoPermitidoPorRol(String estadoNuevo) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean cocina = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_COCINA".equals(authority.getAuthority()));
        boolean cajero = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CAJERO".equals(authority.getAuthority()));
        if (cocina && !List.of("en preparación", "listo").contains(estadoNuevo)) {
            throw new BadRequestException("Cocina solo puede marcar pedidos en preparacion o listos");
        }
        if (cajero && !"entregado".equals(estadoNuevo)) {
            throw new BadRequestException("Cajero solo puede marcar pedidos como entregados");
        }
    }

    public void delete(UUID id) {
        pedidoRepository.deleteById(id);
    }

    private boolean validarTransicion(String actual, String nuevo) {
        return switch (actual) {
            case "registrado" -> nuevo.equals("en preparación");
            case "en preparación" -> nuevo.equals("listo");
            case "listo" -> nuevo.equals("entregado");
            default -> false;
        };
    }

    private Empleado getAuthenticatedEmpleado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new BadRequestException("No se pudo identificar al empleado autenticado");
        }

        return empleadoRepository.findByUser(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Empleado autenticado no encontrado"));
    }

    private void validarDatosDelivery(Cliente cliente, String tipoAtencion) {
        if (DELIVERY.equals(tipoAtencion) && (isBlank(cliente.getDireccion()) || isBlank(cliente.getCelular()))) {
            throw new BadRequestException("El cliente no tiene direccion y celular registrados para delivery");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private BigDecimal setRecetas(Pedido pedido, List<PedidoRecetaRequest> recetasRequest, Map<UUID, BigDecimal> insumos) {
        BigDecimal total = BigDecimal.ZERO;
        for (PedidoRecetaRequest recetaRequest : recetasRequest) {
            Receta receta = recetaRepository.findById(recetaRequest.getIdReceta())
                    .orElseThrow(() -> new ResourceNotFoundException("Receta no encontrada"));
            if (!ACTIVE_STATUS.equalsIgnoreCase(receta.getEstado())) {
                throw new BadRequestException("No puede registrar un pedido con una receta inactiva: " + receta.getNombre());
            }
            String tamano = recetaRequest.getTamano().trim().toUpperCase();
            BigDecimal precioUnitario = precioPorTamano(receta, tamano);
            total = total.add(precioUnitario.multiply(BigDecimal.valueOf(recetaRequest.getCantidad())));

            PedidoReceta pedidoReceta = PedidoReceta.builder()
                    .pedido(pedido)
                    .receta(receta)
                    .cantidad(recetaRequest.getCantidad())
                    .tamano(tamano)
                    .precioUnitario(precioUnitario)
                    .build();
            pedido.getRecetas().add(pedidoReceta);

            for (RecetaIngrediente ingrediente : receta.getIngredientes()) {
                Inventario inventario = ingrediente.getInventario();
                if (!ACTIVE_STATUS.equalsIgnoreCase(inventario.getEstado())) {
                    throw new BadRequestException("La receta contiene un insumo inactivo: " + inventario.getNombreInsumo());
                }
                BigDecimal cantidad = ingrediente.getCantidadPorTamano(tamano).multiply(BigDecimal.valueOf(recetaRequest.getCantidad()));
                insumos.merge(inventario.getIdInsumo(), cantidad, BigDecimal::add);
            }
        }
        return total;
    }

    private BigDecimal precioPorTamano(Receta receta, String tamano) {
        return switch (tamano) {
            case "PERSONAL" -> receta.getPrecio();
            case "MEDIANA" -> receta.getPrecioMediana() == null ? receta.getPrecio() : receta.getPrecioMediana();
            case "FAMILIAR" -> receta.getPrecioFamiliar() == null ? receta.getPrecio() : receta.getPrecioFamiliar();
            default -> throw new BadRequestException("Tamaño de receta inválido: " + tamano);
        };
    }

    private PedidoResponse toResponse(Pedido pedido) {
        return PedidoResponse.builder()
                .idPedido(pedido.getIdPedido())
                .fechaHora(pedido.getFechaHora())
                .estado(pedido.getEstado())
                .tipoAtencion(pedido.getTipoAtencion())
                .detalleProductos(buildDetalleProductos(pedido))
                .total(pedido.getTotal())
                .idCliente(pedido.getCliente().getIdCliente())
                .nombreCliente(fullName(pedido.getCliente()))
                .idEmpleado(pedido.getEmpleado() == null ? null : pedido.getEmpleado().getIdEmpleado())
                .nombreEmpleado(pedido.getEmpleado() == null ? null : fullName(pedido.getEmpleado()))
                .detalles(buildDetalles(pedido))
                .build();
    }

    private List<PedidoResponse.DetalleResponse> buildDetalles(Pedido pedido) {
        return pedido.getRecetas().stream()
                .map(item -> PedidoResponse.DetalleResponse.builder()
                        .receta(item.getReceta().getNombre())
                        .tamano(item.getTamano())
                        .cantidad(item.getCantidad())
                        .ingredientes(buildIngredientesDetalle(item))
                        .build())
                .toList();
    }

    private List<PedidoResponse.IngredienteResponse> buildIngredientesDetalle(PedidoReceta item) {
        BigDecimal cantidadPedida = BigDecimal.valueOf(item.getCantidad());
        return item.getReceta().getIngredientes().stream()
                .map(ingrediente -> {
                    BigDecimal cantidadPorUnidad = ingrediente.getCantidadPorTamano(item.getTamano());
                    Inventario inventario = ingrediente.getInventario();
                    return PedidoResponse.IngredienteResponse.builder()
                            .nombreInsumo(inventario.getNombreInsumo())
                            .unidad(inventario.getUnidad())
                            .cantidadPorUnidad(cantidadPorUnidad)
                            .cantidadTotal(cantidadPorUnidad.multiply(cantidadPedida))
                            .build();
                })
                .toList();
    }

    private String buildDetalleProductos(Pedido pedido) {
        return pedido.getRecetas().stream()
                .map(item -> item.getReceta().getNombre() + " " + tamanoLabel(item.getTamano()) + " x" + item.getCantidad())
                .collect(Collectors.joining(", "));
    }

    private String tamanoLabel(String tamano) {
        return switch (String.valueOf(tamano).toUpperCase()) {
            case "MEDIANA" -> "Mediana";
            case "FAMILIAR" -> "Familiar";
            default -> "Personal";
        };
    }

    private String fullName(Empleado empleado) {
        return String.join(" ", empleado.getNombres(), empleado.getApellidos()).trim();
    }

    private String fullName(Cliente cliente) {
        return String.join(" ", cliente.getNombre(), cliente.getApellido()).trim();
    }
}
