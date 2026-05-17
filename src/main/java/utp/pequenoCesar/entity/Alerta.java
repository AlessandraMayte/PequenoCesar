package utp.pequenoCesar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "alertas")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_alerta")
    private UUID idAlerta;

    @Column(name = "tipo")
    private String tipo;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "estado")
    private String estado;

    @ManyToOne
    @JoinColumn(name = "id_insumo")
    private Inventario inventario;
}