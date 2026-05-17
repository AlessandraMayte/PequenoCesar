package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import utp.pequenoCesar.config.Mapper;
import utp.pequenoCesar.dto.request.InventarioEstadoRequest;
import utp.pequenoCesar.dto.request.InventarioRequest;
import utp.pequenoCesar.dto.response.InventarioResponse;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.InventarioRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventarioService {

    private static final Logger logger = LoggerFactory.getLogger(InventarioService.class);
    private static final String DEFAULT_ESTADO = "Activo";

    private final InventarioRepository inventarioRepository;
    private final AlertaService alertaService;
    private final Mapper mapper;

    public List<InventarioResponse> findAll() {
        return mapper.mapList(inventarioRepository.findAll(), InventarioResponse.class);
    }

    public InventarioResponse findById(UUID id) {
        return inventarioRepository.findById(id)
                .map(i -> mapper.map(i, InventarioResponse.class))
                .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));
    }

    public List<InventarioResponse> findByStockBajo() {
        return mapper.mapList(inventarioRepository.findByStockBajo(), InventarioResponse.class);
    }

    public List<InventarioResponse> findByFechaCaducidadProxima(int dias) {
        LocalDate fechaLimite = LocalDate.now().plusDays(dias);
        return mapper.mapList(inventarioRepository.findByFechaCaducidadProxima(fechaLimite), InventarioResponse.class);
    }

    public InventarioResponse save(InventarioRequest request) {
        Inventario inventario = Inventario.builder()
                .nombreInsumo(request.getNombreInsumo())
                .stockActual(request.getStockActual())
                .unidad(request.getUnidad())
                .stockMinimo(request.getStockMinimo())
                .fechaCaducidad(request.getFechaCaducidad())
                .estado(DEFAULT_ESTADO)
                .build();

        Inventario saved = inventarioRepository.save(inventario);
        verificarStock(saved);
        return mapper.map(saved, InventarioResponse.class);
    }

    @Transactional
    public InventarioResponse update(UUID id, InventarioRequest request) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));

        inventario.setNombreInsumo(request.getNombreInsumo());
        inventario.setStockActual(request.getStockActual());
        inventario.setUnidad(request.getUnidad());
        inventario.setStockMinimo(request.getStockMinimo());
        inventario.setFechaCaducidad(request.getFechaCaducidad());

        Inventario saved = inventarioRepository.save(inventario);
        verificarStock(saved);
        return mapper.map(saved, InventarioResponse.class);
    }

    @Transactional
    public InventarioResponse updateEstado(UUID id, InventarioEstadoRequest request) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));

        inventario.setEstado(normalizeEstado(request.getEstado()));
        return mapper.map(inventarioRepository.save(inventario), InventarioResponse.class);
    }

    @Transactional
    public void descontarInsumos(Map<UUID, BigDecimal> insumos) {
        for (Map.Entry<UUID, BigDecimal> entry : insumos.entrySet()) {
            Inventario inventario = inventarioRepository.findById(entry.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado: " + entry.getKey()));

            BigDecimal nuevoStock = inventario.getStockActual().subtract(entry.getValue());
            if (nuevoStock.compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Stock insuficiente para: " + inventario.getNombreInsumo());
            }

            inventario.setStockActual(nuevoStock);
            inventarioRepository.save(inventario);
            verificarStock(inventario);
        }
    }

    @Transactional
    public InventarioResponse agregarStock(UUID id, BigDecimal cantidad) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));

        inventario.setStockActual(inventario.getStockActual().add(cantidad));
        Inventario saved = inventarioRepository.save(inventario);
        verificarStock(inventario);
        return mapper.map(saved, InventarioResponse.class);
    }

    @Transactional
    public void registrarMerma(UUID id) {
        Inventario inventario = inventarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));

        inventario.setStockActual(BigDecimal.ZERO);
        inventarioRepository.save(inventario);
        verificarStock(inventario);
    }

    public void delete(UUID id) {
        if (!inventarioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Insumo no encontrado");
        }
        inventarioRepository.deleteById(id);
    }

    private void verificarStock(Inventario inventario) {
        if (inventario.getStockActual().compareTo(inventario.getStockMinimo()) <= 0) {
            alertaService.crearAlertaStock(inventario);
        } else {
            alertaService.resolverAlertasStock(inventario);
        }
    }

    private String normalizeEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return DEFAULT_ESTADO;
        }
        return "inactivo".equalsIgnoreCase(estado) ? "Inactivo" : DEFAULT_ESTADO;
    }
}
