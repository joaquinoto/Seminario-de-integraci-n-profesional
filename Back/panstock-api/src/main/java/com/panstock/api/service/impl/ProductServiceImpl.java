package com.panstock.api.service.impl;

import com.panstock.api.dto.request.ProductRequest;
import com.panstock.api.dto.response.ProductResponse;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.ProductCategory;
import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.ProductMapper;
import com.panstock.api.repository.ProductCategoryRepository;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.repository.SupplierRepository;
import com.panstock.api.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final SupplierRepository supplierRepository;

    @Override
    public ProductResponse create(ProductRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        Supplier supplier = findSupplierIfPresent(request.defaultSupplierId());

        Product product = new Product();
        applyRequest(product, request, category, supplier);

        Product saved = productRepository.save(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findAll(ProductOrigin origin, Long categoryId, Boolean activeOnly) {
        List<Product> products;

        if (origin != null) {
            products = productRepository.findActiveByOrigin(origin);
        } else if (categoryId != null) {
            products = productRepository.findActiveByCategoryId(categoryId);
        } else if (Boolean.TRUE.equals(activeOnly)) {
            products = productRepository.findActive();
        } else {
            products = productRepository.findAll();
        }

        return products.stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        Product product = findProduct(id);
        return ProductMapper.toResponse(product);
    }

    @Override
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);
        ProductCategory category = findCategory(request.categoryId());
        Supplier supplier = findSupplierIfPresent(request.defaultSupplierId());

        applyRequest(product, request, category, supplier);

        Product saved = productRepository.save(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private void applyRequest(
            Product product,
            ProductRequest request,
            ProductCategory category,
            Supplier supplier
    ) {
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setDefaultSupplier(supplier);
        product.setOrigin(request.origin());
        product.setPerishable(request.perishable());
        product.setUnitType(request.unitType());
        product.setCostPrice(request.costPrice());
        product.setSalePrice(request.salePrice());
        product.setMinimumStock(request.minimumStock());
        product.setActive(request.active() != null ? request.active() : true);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + id));
    }

    private ProductCategory findCategory(Long id) {
        return productCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada con id " + id));
    }

    private Supplier findSupplierIfPresent(Long id) {
        if (id == null) {
            return null;
        }

        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id " + id));
    }
}