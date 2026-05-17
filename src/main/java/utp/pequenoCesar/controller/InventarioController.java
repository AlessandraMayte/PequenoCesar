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

import utp.pequenoCesar.dto.request.InventarioEstadoRequest;
import utp.pequenoCesar.dto.request.InventarioRequest;
import utp.pequenoCesar.dto.request.InventarioStockRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.InventarioResponse;
import utp.pequenoCesar.service.InventarioService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventario")
@RequiredArgsConstructor
public class InventarioController {

    private final InventarioService inventarioService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<InventarioResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<InventarioResponse>>builder()
                .success(true)
                .data(inventarioService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<InventarioResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<InventarioResponse>builder()
                .success(true)
                .data(inventarioService.findById(id))
                .build());
    }

    @GetMapping("/stock-bajo")
    public ResponseEntity<ApiResponseDto<List<InventarioResponse>>> findStockBajo() {
        return ResponseEntity.ok(ApiResponseDto.<List<InventarioResponse>>builder()
                .success(true)
                .data(inventarioService.findByStockBajo())
                .build());
    }

    @GetMapping("/proximos")
    public ResponseEntity<ApiResponseDto<List<InventarioResponse>>> findProximos(
            @RequestParam(defaultValue = "7") int dias) {
        return ResponseEntity.ok(ApiResponseDto.<List<InventarioResponse>>builder()
                .success(true)
                .data(inventarioService.findByFechaCaducidadProxima(dias))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<InventarioResponse>> save(
            @Valid @RequestBody InventarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<InventarioResponse>builder()
                .success(true)
                .message("Insumo registrado")
                .data(inventarioService.save(request))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponseDto<InventarioResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody InventarioRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<InventarioResponse>builder()
                .success(true)
                .message("Insumo actualizado")
                .data(inventarioService.update(id, request))
                .build());
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ApiResponseDto<InventarioResponse>> updateEstado(
            @PathVariable UUID id,
            @Valid @RequestBody InventarioEstadoRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<InventarioResponse>builder()
                .success(true)
                .message("Estado del insumo actualizado")
                .data(inventarioService.updateEstado(id, request))
                .build());
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<ApiResponseDto<InventarioResponse>> agregarStock(
            @PathVariable UUID id,
            @Valid @RequestBody InventarioStockRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<InventarioResponse>builder()
                .success(true)
                .message("Stock agregado")
                .data(inventarioService.agregarStock(id, request.getCantidad()))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        inventarioService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
