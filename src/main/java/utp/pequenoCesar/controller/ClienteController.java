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

import utp.pequenoCesar.dto.request.ClienteRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.ClienteResponse;
import utp.pequenoCesar.service.ClienteService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<ClienteResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<ClienteResponse>>builder()
                .success(true)
                .data(clienteService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ClienteResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<ClienteResponse>builder()
                .success(true)
                .data(clienteService.findById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<ClienteResponse>> save(@Valid @RequestBody ClienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<ClienteResponse>builder()
                .success(true)
                .message("Cliente creado exitosamente")
                .data(clienteService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<ClienteResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ClienteRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<ClienteResponse>builder()
                .success(true)
                .message("Cliente actualizado")
                .data(clienteService.update(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        clienteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}