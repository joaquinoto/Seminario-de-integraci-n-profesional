package com.panstock.api.service;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;

import java.util.List;

public interface WasteRecordService {

    WasteRecordResponse create(WasteRecordRequest request);

    List<WasteRecordResponse> findAll();

    WasteRecordResponse findById(Long id);
}