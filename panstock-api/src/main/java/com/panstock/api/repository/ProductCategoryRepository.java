package com.panstock.api.repository;

import com.panstock.api.entity.ProductCategory;

import java.util.List;
import java.util.Optional;

public interface ProductCategoryRepository {

    Optional<ProductCategory> findById(Long id);

    List<ProductCategory> findActive();

    ProductCategory save(ProductCategory category);
}