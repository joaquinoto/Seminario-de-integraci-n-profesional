package com.panstock.api.controller;

import com.panstock.api.dto.request.WasteRecordRequest;
import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.service.WasteRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/waste-records")
@RequiredArgsConstructor
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WasteRecordResponse create(@Valid @RequestBody WasteRecordRequest request) {
        return wasteRecordService.create(request);
    }

    @GetMapping
    public List<WasteRecordResponse> findAll() {
        return wasteRecordService.findAll();
    }

    @GetMapping("/{id}")
    public WasteRecordResponse findById(@PathVariable Long id) {
        return wasteRecordService.findById(id);
    }
}