package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import utp.pequenoCesar.dto.request.ProveedorRequest;
import utp.pequenoCesar.dto.response.ProveedorResponse;
import utp.pequenoCesar.entity.Proveedor;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.ProveedorRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;

    public List<ProveedorResponse> findAll() {
        return proveedorRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public ProveedorResponse findById(UUID id) {
        return proveedorRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
    }

    public ProveedorResponse save(ProveedorRequest request) {
        Proveedor proveedor = Proveedor.builder()
                .nombre(request.getNombre())
                .ruc(request.getRuc())
                .telefono(request.getTelefono())
                .build();

        return toResponse(proveedorRepository.save(proveedor));
    }

    public ProveedorResponse update(UUID id, ProveedorRequest request) {
        Proveedor proveedor = proveedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));

        proveedor.setNombre(request.getNombre());
        proveedor.setRuc(request.getRuc());
        proveedor.setTelefono(request.getTelefono());

        return toResponse(proveedorRepository.save(proveedor));
    }

    public void delete(UUID id) {
        proveedorRepository.deleteById(id);
    }

    private ProveedorResponse toResponse(Proveedor proveedor) {
        return ProveedorResponse.builder()
                .idProveedor(proveedor.getIdProveedor())
                .nombre(proveedor.getNombre())
                .ruc(proveedor.getRuc())
                .telefono(proveedor.getTelefono())
                .fechaCreacion(proveedor.getFechaCreacion())
                .fechaModificacion(proveedor.getFechaModificacion())
                .build();
    }
}
