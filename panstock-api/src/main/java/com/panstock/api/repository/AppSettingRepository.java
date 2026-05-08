package com.panstock.api.repository;

import com.panstock.api.entity.AppSetting;

import java.util.Optional;

public interface AppSettingRepository {

    Optional<AppSetting> findBySettingKey(String settingKey);
}