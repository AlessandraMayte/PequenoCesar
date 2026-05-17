package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import utp.pequenoCesar.dto.response.DashboardKPIsResponse;
import utp.pequenoCesar.dto.response.ReporteIngredienteDiarioResponse;
import utp.pequenoCesar.dto.response.ReporteIngredienteUsadoResponse;
import utp.pequenoCesar.dto.response.ReportePedidoResponse;
import utp.pequenoCesar.dto.response.ReporteResumenResponse;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.entity.Pedido;
import utp.pequenoCesar.entity.PedidoReceta;
import utp.pequenoCesar.entity.RecetaIngrediente;
import utp.pequenoCesar.repository.AlertaRepository;
import utp.pequenoCesar.repository.InventarioRepository;
import utp.pequenoCesar.repository.PedidoRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReporteService {

    private static final Logger logger = LoggerFactory.getLogger(ReporteService.class);

    private final PedidoRepository pedidoRepository;
    private final InventarioRepository inventarioRepository;
    private final AlertaRepository alertaRepository;

    public DashboardKPIsResponse getDashboardKPIs() {
        long totalPedidos = pedidoRepository.count();

        LocalDateTime inicioMes = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        long pedidosMes = pedidoRepository.findAll().stream()
                .filter(p -> p.getFechaHora().isAfter(inicioMes))
                .count();

        List<?> stockBajo = inventarioRepository.findByStockBajo();

        long alertasPendientes = alertaRepository.findByEstado("pendiente").size();

        double porcentajeMerma = calcularPorcentajeMerma();

        return DashboardKPIsResponse.builder()
                .totalPedidos(totalPedidos)
                .pedidosMes(pedidosMes)
                .porcentajeMerma(porcentajeMerma)
                .stockBajo(stockBajo.size())
                .alertasPendientes(alertasPendientes)
                .build();
    }

    public ReporteResumenResponse getResumen(LocalDate inicio, LocalDate fin) {
        LocalDate fechaInicio = inicio == null ? LocalDate.now().withDayOfMonth(1) : inicio;
        LocalDate fechaFin = fin == null ? LocalDate.now() : fin;
        LocalDateTime desde = fechaInicio.atStartOfDay();
        LocalDateTime hasta = fechaFin.plusDays(1).atStartOfDay();

        List<Pedido> pedidos = pedidoRepository.findAll().stream()
                .filter(pedido -> !pedido.getFechaHora().isBefore(desde) && pedido.getFechaHora().isBefore(hasta))
                .toList();

        BigDecimal totalVendido = pedidos.stream()
                .map(pedido -> BigDecimal.valueOf(pedido.getTotal() == null ? 0 : pedido.getTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal promedioPedido = pedidos.isEmpty()
                ? BigDecimal.ZERO
                : totalVendido.divide(BigDecimal.valueOf(pedidos.size()), 2, RoundingMode.HALF_UP);

        return ReporteResumenResponse.builder()
                .inicio(fechaInicio)
                .fin(fechaFin)
                .totalVendido(totalVendido.setScale(2, RoundingMode.HALF_UP))
                .cantidadPedidos(pedidos.size())
                .promedioPedido(promedioPedido)
                .recetasMasVendidas(buildRecetasMasVendidas(pedidos))
                .inventarioCritico(buildInventarioCritico())
                .build();
    }

    public List<ReportePedidoResponse> getPedidos(LocalDate inicio, LocalDate fin, UUID idEmpleado) {
        LocalDate fechaInicio = inicio == null ? LocalDate.now() : inicio;
        LocalDate fechaFin = fin == null ? fechaInicio : fin;
        LocalDateTime desde = fechaInicio.atStartOfDay();
        LocalDateTime hasta = fechaFin.plusDays(1).atStartOfDay();

        return pedidoRepository.findAll().stream()
                .filter(pedido -> !pedido.getFechaHora().isBefore(desde) && pedido.getFechaHora().isBefore(hasta))
                .filter(pedido -> idEmpleado == null || (pedido.getEmpleado() != null && idEmpleado.equals(pedido.getEmpleado().getIdEmpleado())))
                .sorted(Comparator.comparing(Pedido::getFechaHora).reversed())
                .map(this::toReportePedido)
                .toList();
    }

    public List<ReporteIngredienteUsadoResponse> getIngredientesUsados(LocalDate inicio, LocalDate fin) {
        List<Pedido> pedidos = getPedidosConConsumo(inicio, fin);
        Map<UUID, ReporteIngredienteUsadoResponse> ingredientes = new HashMap<>();

        for (Pedido pedido : pedidos) {
            for (PedidoReceta pedidoReceta : pedido.getRecetas()) {
                BigDecimal cantidadVendida = BigDecimal.valueOf(pedidoReceta.getCantidad());
                for (RecetaIngrediente ingrediente : pedidoReceta.getReceta().getIngredientes()) {
                    Inventario insumo = ingrediente.getInventario();
                    ReporteIngredienteUsadoResponse row = ingredientes.computeIfAbsent(insumo.getIdInsumo(), ignored ->
                            ReporteIngredienteUsadoResponse.builder()
                                    .idInsumo(insumo.getIdInsumo())
                                    .nombreInsumo(insumo.getNombreInsumo())
                                    .unidad(insumo.getUnidad())
                                    .cantidadUsada(BigDecimal.ZERO)
                                    .build());
                    row.setCantidadUsada(row.getCantidadUsada().add(ingrediente.getCantidadPorTamano(pedidoReceta.getTamano()).multiply(cantidadVendida)));
                }
            }
        }

        return ingredientes.values().stream()
                .map(item -> ReporteIngredienteUsadoResponse.builder()
                        .idInsumo(item.getIdInsumo())
                        .nombreInsumo(item.getNombreInsumo())
                        .unidad(item.getUnidad())
                        .cantidadUsada(item.getCantidadUsada().setScale(2, RoundingMode.HALF_UP))
                        .build())
                .sorted(Comparator.comparing(ReporteIngredienteUsadoResponse::getCantidadUsada).reversed())
                .toList();
    }

    public List<ReporteIngredienteDiarioResponse> getIngredientesUsadosPorDia(LocalDate inicio, LocalDate fin) {
        List<Pedido> pedidos = getPedidosConConsumo(inicio, fin);
        Map<String, ReporteIngredienteDiarioResponse> ingredientesPorDia = new HashMap<>();

        for (Pedido pedido : pedidos) {
            LocalDate fecha = pedido.getFechaHora().toLocalDate();
            for (PedidoReceta pedidoReceta : pedido.getRecetas()) {
                BigDecimal cantidadVendida = BigDecimal.valueOf(pedidoReceta.getCantidad());
                for (RecetaIngrediente ingrediente : pedidoReceta.getReceta().getIngredientes()) {
                    Inventario insumo = ingrediente.getInventario();
                    String key = fecha + "|" + insumo.getIdInsumo();
                    ReporteIngredienteDiarioResponse row = ingredientesPorDia.computeIfAbsent(key, ignored ->
                            ReporteIngredienteDiarioResponse.builder()
                                    .fecha(fecha)
                                    .idInsumo(insumo.getIdInsumo())
                                    .nombreInsumo(insumo.getNombreInsumo())
                                    .unidad(insumo.getUnidad())
                                    .cantidadUsada(BigDecimal.ZERO)
                                    .build());
                    row.setCantidadUsada(row.getCantidadUsada().add(ingrediente.getCantidadPorTamano(pedidoReceta.getTamano()).multiply(cantidadVendida)));
                }
            }
        }

        return ingredientesPorDia.values().stream()
                .map(item -> ReporteIngredienteDiarioResponse.builder()
                        .fecha(item.getFecha())
                        .idInsumo(item.getIdInsumo())
                        .nombreInsumo(item.getNombreInsumo())
                        .unidad(item.getUnidad())
                        .cantidadUsada(item.getCantidadUsada().setScale(2, RoundingMode.HALF_UP))
                        .build())
                .sorted(Comparator.comparing(ReporteIngredienteDiarioResponse::getFecha)
                        .thenComparing(ReporteIngredienteDiarioResponse::getNombreInsumo))
                .toList();
    }

    private ReportePedidoResponse toReportePedido(Pedido pedido) {
        return ReportePedidoResponse.builder()
                .idPedido(pedido.getIdPedido())
                .fechaHora(pedido.getFechaHora())
                .estado(pedido.getEstado())
                .tipoAtencion(pedido.getTipoAtencion())
                .total(BigDecimal.valueOf(pedido.getTotal() == null ? 0 : pedido.getTotal()).setScale(2, RoundingMode.HALF_UP))
                .idEmpleado(pedido.getEmpleado() == null ? null : pedido.getEmpleado().getIdEmpleado())
                .nombreVendedor(pedido.getEmpleado() == null ? null : fullName(pedido.getEmpleado().getNombres(), pedido.getEmpleado().getApellidos()))
                .nombreCliente(fullName(pedido.getCliente().getNombre(), pedido.getCliente().getApellido()))
                .detalles(pedido.getRecetas().stream()
                        .map(item -> ReportePedidoResponse.DetallePedidoResponse.builder()
                                .receta(item.getReceta().getNombre())
                                .tamano(item.getTamano())
                                .cantidad(item.getCantidad())
                                .precioUnitario(item.getPrecioUnitario())
                                .subtotal(item.getPrecioUnitario().multiply(BigDecimal.valueOf(item.getCantidad())).setScale(2, RoundingMode.HALF_UP))
                                .build())
                        .toList())
                .build();
    }

    private String fullName(String nombres, String apellidos) {
        return String.join(" ", nombres == null ? "" : nombres, apellidos == null ? "" : apellidos).trim();
    }

    private List<Pedido> getPedidosConConsumo(LocalDate inicio, LocalDate fin) {
        LocalDate fechaInicio = inicio == null ? LocalDate.now().withDayOfMonth(1) : inicio;
        LocalDate fechaFin = fin == null ? LocalDate.now() : fin;
        LocalDateTime desde = fechaInicio.atStartOfDay();
        LocalDateTime hasta = fechaFin.plusDays(1).atStartOfDay();

        return pedidoRepository.findAll().stream()
                .filter(pedido -> pedido.getFechaHora() != null)
                .filter(pedido -> !pedido.getFechaHora().isBefore(desde) && pedido.getFechaHora().isBefore(hasta))
                .toList();
    }

    private List<ReporteResumenResponse.RecetaVendidaResponse> buildRecetasMasVendidas(List<Pedido> pedidos) {
        Map<String, ReporteResumenResponse.RecetaVendidaResponse> recetas = new HashMap<>();
        for (Pedido pedido : pedidos) {
            for (PedidoReceta item : pedido.getRecetas()) {
                String tamano = item.getTamano() == null ? "PERSONAL" : item.getTamano();
                String key = item.getReceta().getIdReceta() + "|" + tamano;
                BigDecimal subtotal = item.getPrecioUnitario()
                        .multiply(BigDecimal.valueOf(item.getCantidad()))
                        .setScale(2, RoundingMode.HALF_UP);
                ReporteResumenResponse.RecetaVendidaResponse row = recetas.computeIfAbsent(key, ignored ->
                        ReporteResumenResponse.RecetaVendidaResponse.builder()
                                .nombreReceta(item.getReceta().getNombre())
                                .tamano(tamano)
                                .cantidad(0)
                                .totalVendido(BigDecimal.ZERO)
                                .build());
                row.setCantidad(row.getCantidad() + item.getCantidad());
                row.setTotalVendido(row.getTotalVendido().add(subtotal));
            }
        }

        return recetas.values().stream()
                .sorted(Comparator.comparing(ReporteResumenResponse.RecetaVendidaResponse::getCantidad).reversed())
                .limit(8)
                .toList();
    }

    private List<ReporteResumenResponse.InventarioCriticoResponse> buildInventarioCritico() {
        return inventarioRepository.findByStockBajo().stream()
                .sorted(Comparator.comparing(Inventario::getStockActual))
                .map(item -> ReporteResumenResponse.InventarioCriticoResponse.builder()
                        .nombreInsumo(item.getNombreInsumo())
                        .stockActual(item.getStockActual())
                        .stockMinimo(item.getStockMinimo())
                        .unidad(item.getUnidad())
                        .fechaCaducidad(item.getFechaCaducidad())
                        .estadoStock(item.getStockActual().compareTo(item.getStockMinimo()) <= 0 ? "Critico" : "Bajo")
                        .build())
                .toList();
    }

    private double calcularPorcentajeMerma() {
        logger.debug("Calculando porcentaje de merma");
        List<?> todosInsumos = inventarioRepository.findAll();
        if (todosInsumos.isEmpty()) {
            return 0.0;
        }

        LocalDate fechaLimite = LocalDate.now().plusDays(7);
        List<?> proximosCaducar = inventarioRepository.findByFechaCaducidadProxima(fechaLimite);

        double porcentaje = (double) proximosCaducar.size() / todosInsumos.size() * 100;
        logger.debug("Porcentaje de merma calculado: {}%", String.format("%.2f", porcentaje));
        return Math.round(porcentaje * 100.0) / 100.0;
    }
}
