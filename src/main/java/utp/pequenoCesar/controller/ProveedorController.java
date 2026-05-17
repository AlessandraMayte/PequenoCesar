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

import utp.pequenoCesar.dto.request.ProveedorRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.ProveedorResponse;
import utp.pequenoCesar.service.ProveedorService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedorController {

    private final ProveedorService proveedorService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<ProveedorResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<ProveedorResponse>>builder()
                .success(true)
                .data(proveedorService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ProveedorResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<ProveedorResponse>builder()
                .success(true)
                .data(proveedorService.findById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<ProveedorResponse>> save(
            @Valid @RequestBody ProveedorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<ProveedorResponse>builder()
                .success(true)
                .message("Proveedor registrado")
                .data(proveedorService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ProveedorResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ProveedorRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<ProveedorResponse>builder()
                .success(true)
                .message("Proveedor actualizado")
                .data(proveedorService.update(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        proveedorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
