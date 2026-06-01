package com.panstock.api.service;

import com.panstock.api.dto.response.RestockSuggestionResponse;

import java.util.List;

/**
 * Servicio que genera sugerencias de reposición de stock.
 * Solo consumible por el rol OWNER (restricción aplicada en SecurityConfig).
 */
public interface RestockService {

    /**
     * Devuelve la lista de productos cuyo stock actual está por debajo del mínimo
     * configurado, enriquecida con información del último lote recibido y el
     * horario de pedido del proveedor.
     */
    List<RestockSuggestionResponse> getSuggestions();
}