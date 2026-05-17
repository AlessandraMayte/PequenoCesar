package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import utp.pequenoCesar.dto.request.RecetaEstadoRequest;
import utp.pequenoCesar.dto.request.RecetaRequest;
import utp.pequenoCesar.dto.response.RecetaResponse;
import utp.pequenoCesar.entity.Inventario;
import utp.pequenoCesar.entity.Receta;
import utp.pequenoCesar.entity.RecetaIngrediente;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.InventarioRepository;
import utp.pequenoCesar.repository.RecetaRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecetaService {

    private static final String DEFAULT_ESTADO = "Activo";

    private final RecetaRepository recetaRepository;
    private final InventarioRepository inventarioRepository;

    @Transactional(readOnly = true)
    public List<RecetaResponse> findAll() {
        return recetaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecetaResponse findById(UUID id) {
        return recetaRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Receta no encontrada"));
    }

    @Transactional
    public RecetaResponse save(RecetaRequest request) {
        Receta receta = Receta.builder()
                .nombre(request.getNombre())
                .precio(request.getPrecioPersonal())
                .precioMediana(request.getPrecioMediana())
                .precioFamiliar(request.getPrecioFamiliar())
                .estado(DEFAULT_ESTADO)
                .build();
        setIngredientes(receta, request.getIngredientes());

        return toResponse(recetaRepository.save(receta));
    }

    @Transactional
    public RecetaResponse update(UUID id, RecetaRequest request) {
        Receta receta = recetaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Receta no encontrada"));

        receta.setNombre(request.getNombre());
        receta.setPrecio(request.getPrecioPersonal());
        receta.setPrecioMediana(request.getPrecioMediana());
        receta.setPrecioFamiliar(request.getPrecioFamiliar());
        receta.getIngredientes().clear();
        setIngredientes(receta, request.getIngredientes());

        return toResponse(recetaRepository.save(receta));
    }

    @Transactional
    public RecetaResponse updateEstado(UUID id, RecetaEstadoRequest request) {
        Receta receta = recetaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Receta no encontrada"));

        receta.setEstado(normalizeEstado(request.getEstado()));
        return toResponse(recetaRepository.save(receta));
    }

    public void delete(UUID id) {
        if (!recetaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Receta no encontrada");
        }
        recetaRepository.deleteById(id);
    }

    private void setIngredientes(Receta receta, List<RecetaRequest.IngredienteRequest> ingredientesRequest) {
        Set<UUID> insumos = new HashSet<>();
        for (RecetaRequest.IngredienteRequest ingredienteRequest : ingredientesRequest) {
            if (!insumos.add(ingredienteRequest.getIdInsumo())) {
                throw new BadRequestException("No puede repetir un ingrediente en la misma receta");
            }

            Inventario inventario = inventarioRepository.findById(ingredienteRequest.getIdInsumo())
                    .orElseThrow(() -> new ResourceNotFoundException("Insumo no encontrado"));
            if (!DEFAULT_ESTADO.equalsIgnoreCase(inventario.getEstado())) {
                throw new BadRequestException("No puede agregar un insumo inactivo a la receta: " + inventario.getNombreInsumo());
            }

            RecetaIngrediente ingrediente = RecetaIngrediente.builder()
                    .receta(receta)
                    .inventario(inventario)
                    .cantidad(ingredienteRequest.getCantidadPersonal())
                    .cantidadMediana(ingredienteRequest.getCantidadMediana())
                    .cantidadFamiliar(ingredienteRequest.getCantidadFamiliar())
                    .build();
            receta.getIngredientes().add(ingrediente);
        }
    }

    private RecetaResponse toResponse(Receta receta) {
        BigDecimal precioPersonal = receta.getPrecio();
        BigDecimal precioMediana = receta.getPrecioMediana() == null ? precioPersonal : receta.getPrecioMediana();
        BigDecimal precioFamiliar = receta.getPrecioFamiliar() == null ? precioPersonal : receta.getPrecioFamiliar();

        return RecetaResponse.builder()
                .idReceta(receta.getIdReceta())
                .nombre(receta.getNombre())
                .precio(precioPersonal)
                .precioPersonal(precioPersonal)
                .precioMediana(precioMediana)
                .precioFamiliar(precioFamiliar)
                .estado(receta.getEstado())
                .ingredientes(receta.getIngredientes().stream()
                        .map(this::toIngredienteResponse)
                        .toList())
                .build();
    }

    private RecetaResponse.IngredienteResponse toIngredienteResponse(RecetaIngrediente ingrediente) {
        Inventario inventario = ingrediente.getInventario();
        BigDecimal cantidadPersonal = ingrediente.getCantidad();
        BigDecimal cantidadMediana = ingrediente.getCantidadMediana() == null ? cantidadPersonal : ingrediente.getCantidadMediana();
        BigDecimal cantidadFamiliar = ingrediente.getCantidadFamiliar() == null ? cantidadPersonal : ingrediente.getCantidadFamiliar();
        return RecetaResponse.IngredienteResponse.builder()
                .idInsumo(inventario.getIdInsumo())
                .nombreInsumo(inventario.getNombreInsumo())
                .unidad(inventario.getUnidad())
                .cantidad(cantidadPersonal)
                .cantidadPersonal(cantidadPersonal)
                .cantidadMediana(cantidadMediana)
                .cantidadFamiliar(cantidadFamiliar)
                .build();
    }

    private String normalizeEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return DEFAULT_ESTADO;
        }
        return "inactivo".equalsIgnoreCase(estado) ? "Inactivo" : DEFAULT_ESTADO;
    }
}
