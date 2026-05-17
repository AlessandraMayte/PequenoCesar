package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKPIsResponse {

    private long totalPedidos;
    private long pedidosMes;
    private double porcentajeMerma;
    private long stockBajo;
    private long alertasPendientes;
    private UUID insumoStockCritico;
}