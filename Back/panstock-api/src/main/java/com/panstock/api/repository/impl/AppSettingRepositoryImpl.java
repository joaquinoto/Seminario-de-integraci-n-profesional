package com.panstock.api.repository.impl;

import com.panstock.api.entity.AppSetting;
import com.panstock.api.repository.AppSettingRepository;
import com.panstock.api.repository.jpa.AppSettingJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AppSettingRepositoryImpl implements AppSettingRepository {

    private final AppSettingJpaRepository appSettingJpaRepository;

    @Override
    public AppSetting save(AppSetting appSetting) {
        return appSettingJpaRepository.save(appSetting);
    }

    @Override
    public Optional<AppSetting> findBySettingKey(String settingKey) {
        return appSettingJpaRepository.findBySettingKey(settingKey);
    }
}