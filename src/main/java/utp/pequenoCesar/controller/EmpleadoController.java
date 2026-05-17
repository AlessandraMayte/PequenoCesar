package utp.pequenoCesar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.dto.request.EmpleadoEstadoRequest;
import utp.pequenoCesar.dto.request.EmpleadoRequest;
import utp.pequenoCesar.dto.request.EmpleadoUpdateRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.EmpleadoResponse;
import utp.pequenoCesar.service.EmpleadoService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/empleados")
@RequiredArgsConstructor
public class EmpleadoController {

    private final EmpleadoService empleadoService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<EmpleadoResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<EmpleadoResponse>>builder()
                .success(true)
                .data(empleadoService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<EmpleadoResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<EmpleadoResponse>builder()
                .success(true)
                .data(empleadoService.findById(id))
                .build());
    }

@PostMapping
    public ResponseEntity<ApiResponseDto<EmpleadoResponse>> save(@Valid @RequestBody EmpleadoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<EmpleadoResponse>builder()
                .success(true)
                .message("Empleado creado exitosamente")
                .data(empleadoService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<EmpleadoResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody EmpleadoUpdateRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<EmpleadoResponse>builder()
                .success(true)
                .message("Empleado actualizado")
                .data(empleadoService.update(id, request))
                .build());
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ApiResponseDto<EmpleadoResponse>> updateEstado(
            @PathVariable UUID id,
            @Valid @RequestBody EmpleadoEstadoRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<EmpleadoResponse>builder()
                .success(true)
                .message("Estado del empleado actualizado")
                .data(empleadoService.updateEstado(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        empleadoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
