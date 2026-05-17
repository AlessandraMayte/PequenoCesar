package utp.pequenoCesar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.DashboardKPIsResponse;
import utp.pequenoCesar.dto.response.ReporteIngredienteDiarioResponse;
import utp.pequenoCesar.dto.response.ReporteIngredienteUsadoResponse;
import utp.pequenoCesar.dto.response.ReportePedidoResponse;
import utp.pequenoCesar.dto.response.ReporteResumenResponse;
import utp.pequenoCesar.service.ReporteService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponseDto<DashboardKPIsResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponseDto.<DashboardKPIsResponse>builder()
                .success(true)
                .data(reporteService.getDashboardKPIs())
                .build());
    }

    @GetMapping("/resumen")
    public ResponseEntity<ApiResponseDto<ReporteResumenResponse>> getResumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(ApiResponseDto.<ReporteResumenResponse>builder()
                .success(true)
                .data(reporteService.getResumen(inicio, fin))
                .build());
    }

    @GetMapping("/pedidos")
    public ResponseEntity<ApiResponseDto<List<ReportePedidoResponse>>> getPedidos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(required = false) UUID idEmpleado) {
        return ResponseEntity.ok(ApiResponseDto.<List<ReportePedidoResponse>>builder()
                .success(true)
                .data(reporteService.getPedidos(inicio, fin, idEmpleado))
                .build());
    }

    @GetMapping("/ingredientes-usados")
    public ResponseEntity<ApiResponseDto<List<ReporteIngredienteUsadoResponse>>> getIngredientesUsados(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(ApiResponseDto.<List<ReporteIngredienteUsadoResponse>>builder()
                .success(true)
                .data(reporteService.getIngredientesUsados(inicio, fin))
                .build());
    }

    @GetMapping("/ingredientes-usados/dias")
    public ResponseEntity<ApiResponseDto<List<ReporteIngredienteDiarioResponse>>> getIngredientesUsadosPorDia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(ApiResponseDto.<List<ReporteIngredienteDiarioResponse>>builder()
                .success(true)
                .data(reporteService.getIngredientesUsadosPorDia(inicio, fin))
                .build());
    }
}
