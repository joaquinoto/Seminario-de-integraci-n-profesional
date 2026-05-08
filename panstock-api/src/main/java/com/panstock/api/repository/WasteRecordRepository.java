package com.panstock.api.repository;

import com.panstock.api.entity.WasteRecord;

import java.util.List;
import java.util.Optional;

public interface WasteRecordRepository {

    WasteRecord save(WasteRecord wasteRecord);

    Optional<WasteRecord> findById(Long id);

    List<WasteRecord> findAll();
}