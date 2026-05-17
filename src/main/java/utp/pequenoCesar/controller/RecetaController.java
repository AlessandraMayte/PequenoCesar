package utp.pequenoCesar.controller;

import jakarta.validation.Valid;
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
import utp.pequenoCesar.dto.request.RecetaEstadoRequest;
import utp.pequenoCesar.dto.request.RecetaRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.RecetaResponse;
import utp.pequenoCesar.service.RecetaService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recetas")
@RequiredArgsConstructor
public class RecetaController {

    private final RecetaService recetaService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<RecetaResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<RecetaResponse>>builder()
                .success(true)
                .data(recetaService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<RecetaResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<RecetaResponse>builder()
                .success(true)
                .data(recetaService.findById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<RecetaResponse>> save(@Valid @RequestBody RecetaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<RecetaResponse>builder()
                .success(true)
                .message("Receta registrada")
                .data(recetaService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<RecetaResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody RecetaRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<RecetaResponse>builder()
                .success(true)
                .message("Receta actualizada")
                .data(recetaService.update(id, request))
                .build());
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ApiResponseDto<RecetaResponse>> updateEstado(
            @PathVariable UUID id,
            @Valid @RequestBody RecetaEstadoRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<RecetaResponse>builder()
                .success(true)
                .message("Estado de la receta actualizado")
                .data(recetaService.updateEstado(id, request))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        recetaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
