package com.panstock.api.service;

import com.panstock.api.dto.response.AlertGenerationResponse;
import com.panstock.api.dto.response.AlertResponse;

import java.util.List;

public interface AlertService {

    List<AlertResponse> findAll();

    List<AlertResponse> findActive();

    AlertGenerationResponse generateAlerts();

    AlertResponse resolve(Long id);
}