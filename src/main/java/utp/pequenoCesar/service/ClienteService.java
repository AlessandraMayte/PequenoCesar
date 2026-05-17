package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import utp.pequenoCesar.dto.request.ClienteRequest;
import utp.pequenoCesar.dto.response.ClienteResponse;
import utp.pequenoCesar.entity.Cliente;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;
import utp.pequenoCesar.repository.ClienteRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private static final Logger logger = LoggerFactory.getLogger(ClienteService.class);

    private final ClienteRepository clienteRepository;

    public List<ClienteResponse> findAll() {
        logger.debug("Obteniendo todos los clientes");
        return clienteRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public ClienteResponse findById(UUID id) {
        logger.debug("Buscando cliente por id: {}", id);
        return clienteRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + id));
    }

    public ClienteResponse save(ClienteRequest request) {
        logger.info("Creando nuevo cliente: {}", request.getNombre());
        if (clienteRepository.existsByDni(request.getDni())) {
            throw new BadRequestException("Ya existe un cliente con ese DNI");
        }

        Cliente cliente = Cliente.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .dni(request.getDni())
                .direccion(request.getDireccion())
                .celular(request.getCelular())
                .build();

        return toResponse(clienteRepository.save(cliente));
    }

    public ClienteResponse update(UUID id, ClienteRequest request) {
        logger.info("Actualizando cliente con id: {}", id);
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + id));

        if (!request.getDni().equals(cliente.getDni()) && clienteRepository.existsByDni(request.getDni())) {
            throw new BadRequestException("Ya existe un cliente con ese DNI");
        }

        cliente.setNombre(request.getNombre());
        cliente.setApellido(request.getApellido());
        cliente.setDni(request.getDni());
        cliente.setDireccion(request.getDireccion());
        cliente.setCelular(request.getCelular());

        return toResponse(clienteRepository.save(cliente));
    }

    public void delete(UUID id) {
        logger.info("Eliminando cliente con id: {}", id);
        clienteRepository.deleteById(id);
    }

    private ClienteResponse toResponse(Cliente cliente) {
        return ClienteResponse.builder()
                .idCliente(cliente.getIdCliente())
                .nombre(cliente.getNombre())
                .apellido(cliente.getApellido())
                .dni(cliente.getDni())
                .direccion(cliente.getDireccion())
                .celular(cliente.getCelular())
                .fechaCreacion(cliente.getFechaCreacion())
                .fechaModificacion(cliente.getFechaModificacion())
                .build();
    }
}
