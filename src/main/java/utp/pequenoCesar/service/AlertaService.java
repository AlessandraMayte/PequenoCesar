package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import utp.pequenoCesar.dto.request.AlertaUpdateRequest;
import utp.pequenoCesar.dto.response.AlertaResponse;
import utp.pequenoCesar.entity.Alerta;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.AlertaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertaService {

    private static final String ESTADO_PENDIENTE = "pendiente";
    private static final String TIPO_STOCK_BAJO = "stock bajo";

    private final AlertaRepository alertaRepository;

    public List<AlertaResponse> findAll() {
        return alertaRepository.findAllByOrderByFechaHoraDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AlertaResponse> findByEstado(String estado) {
        return alertaRepository.findByEstadoOrderByFechaHoraDesc(estado).stream()
                .map(this::toResponse)
                .toList();
    }

    public AlertaResponse findById(UUID id) {
        return alertaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta no encontrada"));
    }

    @Transactional
    public AlertaResponse update(UUID id, AlertaUpdateRequest request) {
        Alerta alerta = alertaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta no encontrada"));

        alerta.setEstado(request.getEstado());
        return toResponse(alertaRepository.save(alerta));
    }

    @Transactional
    public void crearAlertaStock(Inventario inventario) {
        if (alertaRepository.existsByInventarioIdInsumoAndTipoAndEstado(
                inventario.getIdInsumo(), TIPO_STOCK_BAJO, ESTADO_PENDIENTE)) {
            return;
        }

        Alerta alerta = Alerta.builder()
                .tipo(TIPO_STOCK_BAJO)
                .fechaHora(LocalDateTime.now())
                .estado(ESTADO_PENDIENTE)
                .inventario(inventario)
                .build();

        alertaRepository.save(alerta);
    }

    @Transactional
    public void resolverAlertasStock(Inventario inventario) {
        List<Alerta> alertas = alertaRepository.findByInventarioIdInsumoAndTipoAndEstado(
                inventario.getIdInsumo(), TIPO_STOCK_BAJO, ESTADO_PENDIENTE);
        alertas.forEach(alerta -> alerta.setEstado("atendida"));
        alertaRepository.saveAll(alertas);
    }

    @Transactional
    public void crearAlertaCaducidad(Inventario inventario) {
        Alerta alerta = Alerta.builder()
                .tipo("caducidad")
                .fechaHora(LocalDateTime.now())
                .estado(ESTADO_PENDIENTE)
                .inventario(inventario)
                .build();

        alertaRepository.save(alerta);
    }

    private AlertaResponse toResponse(Alerta alerta) {
        Inventario inventario = alerta.getInventario();
        return AlertaResponse.builder()
                .idAlerta(alerta.getIdAlerta())
                .tipo(alerta.getTipo())
                .fechaHora(alerta.getFechaHora())
                .estado(alerta.getEstado())
                .idInsumo(inventario == null ? null : inventario.getIdInsumo())
                .nombreInsumo(inventario == null ? null : inventario.getNombreInsumo())
                .stockActual(inventario == null ? null : inventario.getStockActual())
                .stockMinimo(inventario == null ? null : inventario.getStockMinimo())
                .unidad(inventario == null ? null : inventario.getUnidad())
                .build();
    }
}
