package utp.pequenoCesar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.dto.request.AlertaUpdateRequest;
import utp.pequenoCesar.dto.response.AlertaResponse;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.service.AlertaService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alertas")
@RequiredArgsConstructor
public class AlertaController {

    private final AlertaService alertaService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<AlertaResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<AlertaResponse>>builder()
                .success(true)
                .data(alertaService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<AlertaResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<AlertaResponse>builder()
                .success(true)
                .data(alertaService.findById(id))
                .build());
    }

    @GetMapping("/pendientes")
    public ResponseEntity<ApiResponseDto<List<AlertaResponse>>> findPendientes() {
        return ResponseEntity.ok(ApiResponseDto.<List<AlertaResponse>>builder()
                .success(true)
                .data(alertaService.findByEstado("pendiente"))
                .build());
    }

    @GetMapping("/estado")
    public ResponseEntity<ApiResponseDto<List<AlertaResponse>>> findByEstado(
            @RequestParam String estado) {
        return ResponseEntity.ok(ApiResponseDto.<List<AlertaResponse>>builder()
                .success(true)
                .data(alertaService.findByEstado(estado))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<AlertaResponse>> update(
            @PathVariable UUID id,
            @RequestBody AlertaUpdateRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<AlertaResponse>builder()
                .success(true)
                .message("Alerta actualizada")
                .data(alertaService.update(id, request))
                .build());
    }
}