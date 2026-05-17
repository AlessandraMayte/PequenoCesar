package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import utp.pequenoCesar.config.Mapper;
import utp.pequenoCesar.dto.request.EmpleadoEstadoRequest;
import utp.pequenoCesar.dto.request.EmpleadoRequest;
import utp.pequenoCesar.dto.request.EmpleadoUpdateRequest;
import utp.pequenoCesar.dto.response.EmpleadoResponse;
import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.EmpleadoRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmpleadoService {

    private static final Logger logger = LoggerFactory.getLogger(EmpleadoService.class);
    private static final String DEFAULT_ESTADO = "Activo";

    private final EmpleadoRepository empleadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final Mapper mapper;

    public List<EmpleadoResponse> findAll() {
        return mapper.mapList(empleadoRepository.findAll(), EmpleadoResponse.class);
    }

    public EmpleadoResponse findById(UUID id) {
        return empleadoRepository.findById(id)
                .map(e -> mapper.map(e, EmpleadoResponse.class))
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado"));
    }

    public EmpleadoResponse save(EmpleadoRequest request) {
        if (empleadoRepository.existsByUser(request.getUser())) {
            throw new BadRequestException("El usuario del empleado ya existe");
        }

        Empleado empleado = Empleado.builder()
                .nombres(request.getNombres())
                .apellidos(request.getApellidos())
                .user(request.getUser())
                .rol(request.getRol())
                .estado(normalizeEstado(request.getEstado()))
                .contrasena(passwordEncoder.encode(request.getContrasena()))
                .build();

        return mapper.map(empleadoRepository.save(empleado), EmpleadoResponse.class);
    }

    public EmpleadoResponse update(UUID id, EmpleadoUpdateRequest request) {
        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado"));

        if (request.getNombres() != null) {
            empleado.setNombres(request.getNombres());
        }
        if (request.getApellidos() != null) {
            empleado.setApellidos(request.getApellidos());
        }
        if (request.getUser() != null && !request.getUser().equals(empleado.getUser())) {
            if (empleadoRepository.existsByUser(request.getUser())) {
                throw new BadRequestException("El usuario del empleado ya existe");
            }
            empleado.setUser(request.getUser());
        }
        if (request.getContrasena() != null && !request.getContrasena().isBlank()) {
            empleado.setContrasena(passwordEncoder.encode(request.getContrasena()));
        }
        if (request.getRol() != null) {
            empleado.setRol(request.getRol());
        }
        if (request.getEstado() != null) {
            empleado.setEstado(normalizeEstado(request.getEstado()));
        }

        return mapper.map(empleadoRepository.save(empleado), EmpleadoResponse.class);
    }

    public EmpleadoResponse updateEstado(UUID id, EmpleadoEstadoRequest request) {
        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado"));

        empleado.setEstado(normalizeEstado(request.getEstado()));

        return mapper.map(empleadoRepository.save(empleado), EmpleadoResponse.class);
    }

    public void delete(UUID id) {
        empleadoRepository.deleteById(id);
    }

    public Empleado findByUser(String user) {
        return empleadoRepository.findByUser(user).orElse(null);
    }

    private String normalizeEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return DEFAULT_ESTADO;
        }
        return "inactivo".equalsIgnoreCase(estado) ? "Inactivo" : DEFAULT_ESTADO;
    }
}
