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

import utp.pequenoCesar.dto.request.PedidoRequest;
import utp.pequenoCesar.dto.request.PedidoEstadoRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.PedidoResponse;
import utp.pequenoCesar.service.PedidoService;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<PedidoResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponseDto.<List<PedidoResponse>>builder()
                .success(true)
                .data(pedidoService.findAll())
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<PedidoResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseDto.<PedidoResponse>builder()
                .success(true)
                .data(pedidoService.findById(id))
                .build());
    }

    @GetMapping("/estado")
    public ResponseEntity<ApiResponseDto<List<PedidoResponse>>> findByEstado(
            @RequestParam String estado) {
        return ResponseEntity.ok(ApiResponseDto.<List<PedidoResponse>>builder()
                .success(true)
                .data(pedidoService.findByEstado(estado))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<PedidoResponse>> save(@Valid @RequestBody PedidoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.<PedidoResponse>builder()
                .success(true)
                .message("Pedido registrado")
                .data(pedidoService.save(request))
                .build());
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ApiResponseDto<PedidoResponse>> actualizarEstado(
            @PathVariable UUID id,
            @Valid @RequestBody PedidoEstadoRequest request) {
        return ResponseEntity.ok(ApiResponseDto.<PedidoResponse>builder()
                .success(true)
                .message("Estado actualizado")
                .data(pedidoService.actualizarEstado(id, request.getEstado()))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        pedidoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
