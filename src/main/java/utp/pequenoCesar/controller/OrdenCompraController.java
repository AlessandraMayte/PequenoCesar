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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.dto.request.OrdenCompraRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.OrdenCompraResponse;
import utp.pequenoCesar.service.OrdenCompraService;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ordenes")
@RequiredArgsConstructor
public class OrdenCompraController {

    private final OrdenCompraService ordenCompraService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<OrdenCompraResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<OrdenCompraResponse>>builder()
                .success(true)
                .data(ordenCompraService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<OrdenCompraResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<OrdenCompraResponse>builder()
                .success(true)
                .data(ordenCompraService.findById(id))
                .build());
    }

    @GetMapping("/sugeridas")
    public ResponseEntity<ApiResponseDto<List<OrdenCompraResponse>>> findSugeridas() {
        return ResponseEntity.ok(ApiResponseDto.<List<OrdenCompraResponse>>builder()
                .success(true)
                .data(ordenCompraService.findSugeridas())
                .build());
    }

    @GetMapping("/historial")
    public ResponseEntity<ApiResponseDto<List<OrdenCompraResponse>>> findByFechaBetween(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        return ResponseEntity.ok(ApiResponseDto.<List<OrdenCompraResponse>>builder()
                .success(true)
                .data(ordenCompraService.findByFechaBetween(inicio, fin))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<OrdenCompraResponse>> save(
            @Valid @RequestBody OrdenCompraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<OrdenCompraResponse>builder()
                .success(true)
                .message("Orden de compra creada")
                .data(ordenCompraService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<OrdenCompraResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody OrdenCompraRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<OrdenCompraResponse>builder()
                .success(true)
                .message("Orden de compra actualizada")
                .data(ordenCompraService.update(id, request))
                .build());
    }

    @PutMapping("/{id}/recibir")
    public ResponseEntity<ApiResponseDto<OrdenCompraResponse>> recibir(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<OrdenCompraResponse>builder()
                .success(true)
                .message("Orden recibida y stock actualizado")
                .data(ordenCompraService.recibirOrden(id))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        ordenCompraService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
