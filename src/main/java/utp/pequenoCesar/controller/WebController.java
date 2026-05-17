package utp.pequenoCesar.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    @GetMapping("/")
    public String index() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard";
    }

    @GetMapping("/inventario")
    public String inventario() {
        return "inventario";
    }

    @GetMapping("/recetas")
    public String recetas() {
        return "recetas";
    }

    @GetMapping("/pedidos")
    public String pedidos() {
        return "pedidos";
    }

    @GetMapping("/mis-pedidos")
    public String misPedidos() {
        return "mis-pedidos";
    }

    @GetMapping("/cocina-pedidos")
    public String cocinaPedidos() {
        return "cocina-pedidos";
    }

    @GetMapping("/ordenes")
    public String ordenes() {
        return "ordenes";
    }

    @GetMapping("/proveedores")
    public String proveedores() {
        return "proveedores";
    }

    @GetMapping("/clientes")
    public String clientes() {
        return "clientes";
    }

    @GetMapping("/reportes")
    public String reportes() {
        return "reportes";
    }

    @GetMapping("/reportes-pedidos")
    public String reportesPedidos() {
        return "reportes-pedidos";
    }

    @GetMapping("/empleados")
    public String empleados() {
        return "empleados";
    }
}
