package com.panstock.api.service.impl;

import com.panstock.api.dto.request.ProductRequest;
import com.panstock.api.dto.response.ProductResponse;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.ProductCategory;
import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.SupplierType;
import com.panstock.api.enums.UnitType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.repository.ProductCategoryRepository;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.repository.SupplierRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductServiceImplTest {

    private static final Long CATEGORY_ID = 7L;

    @Test
    void createRejectsDuplicateProductName() {
        FakeProductRepository productRepository = new FakeProductRepository();
        productRepository.save(product(1L, "Barrita de cereal externa"));

        FakeProductCategoryRepository categoryRepository = new FakeProductCategoryRepository();
        FakeSupplierRepository supplierRepository = new FakeSupplierRepository();
        ProductServiceImpl productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                supplierRepository
        );
        ProductRequest request = productRequest("barrita de cereal externa");

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> productService.create(request)
        );

        assertThat(exception.getMessage())
                .isEqualTo("Ya existe un producto con el nombre barrita de cereal externa");
        assertThat(productRepository.saveCalls).isEqualTo(1);
        assertThat(categoryRepository.findByIdCalls).isZero();
        assertThat(supplierRepository.findByIdCalls).isZero();
    }

    @Test
    void createSavesProductWhenNameIsAvailable() {
        FakeProductRepository productRepository = new FakeProductRepository();
        FakeProductCategoryRepository categoryRepository = new FakeProductCategoryRepository();
        categoryRepository.save(productCategory());
        FakeSupplierRepository supplierRepository = new FakeSupplierRepository();
        ProductServiceImpl productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                supplierRepository
        );
        String name = "Barrita de cereal externa";

        ProductResponse response = productService.create(productRequest(name));

        assertThat(response.id()).isNotNull();
        assertThat(response.name()).isEqualTo(name);
        assertThat(response.categoryId()).isEqualTo(CATEGORY_ID);
        assertThat(response.categoryName()).isEqualTo("Snacks");
        assertThat(productRepository.saveCalls).isEqualTo(1);
    }

    @Test
    void updateRejectsNameUsedByAnotherProduct() {
        FakeProductRepository productRepository = new FakeProductRepository();
        productRepository.save(product(10L, "Nombre anterior"));
        productRepository.save(product(11L, "Barrita de cereal externa"));

        FakeProductCategoryRepository categoryRepository = new FakeProductCategoryRepository();
        FakeSupplierRepository supplierRepository = new FakeSupplierRepository();
        ProductServiceImpl productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                supplierRepository
        );

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> productService.update(10L, productRequest("barrita de cereal externa"))
        );

        assertThat(exception.getMessage())
                .isEqualTo("Ya existe otro producto con el nombre barrita de cereal externa");
        assertThat(productRepository.saveCalls).isEqualTo(2);
        assertThat(categoryRepository.findByIdCalls).isZero();
        assertThat(supplierRepository.findByIdCalls).isZero();
    }

    @Test
    void updateAllowsSameProductWhenNameIsAvailableForOtherIds() {
        FakeProductRepository productRepository = new FakeProductRepository();
        productRepository.save(product(10L, "Barrita de cereal externa"));

        FakeProductCategoryRepository categoryRepository = new FakeProductCategoryRepository();
        categoryRepository.save(productCategory());
        FakeSupplierRepository supplierRepository = new FakeSupplierRepository();
        ProductServiceImpl productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                supplierRepository
        );

        ProductResponse response = productService.update(
                10L,
                productRequest("Barrita de cereal externa")
        );

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("Barrita de cereal externa");
        assertThat(response.categoryId()).isEqualTo(CATEGORY_ID);
        assertThat(productRepository.saveCalls).isEqualTo(2);
    }

    private ProductRequest productRequest(String name) {
        return new ProductRequest(
                name,
                "Producto externo mock",
                CATEGORY_ID,
                null,
                ProductOrigin.EXTERNAL,
                true,
                UnitType.UNIT,
                new BigDecimal("500.00"),
                new BigDecimal("1200.00"),
                new BigDecimal("10"),
                true
        );
    }

    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setCategory(productCategory());
        product.setOrigin(ProductOrigin.EXTERNAL);
        product.setPerishable(true);
        product.setUnitType(UnitType.UNIT);
        product.setCostPrice(new BigDecimal("500.00"));
        product.setSalePrice(new BigDecimal("1200.00"));
        product.setMinimumStock(new BigDecimal("10"));
        product.setActive(true);
        return product;
    }

    private ProductCategory productCategory() {
        ProductCategory category = new ProductCategory();
        category.setId(CATEGORY_ID);
        category.setName("Snacks");
        category.setActive(true);
        return category;
    }

    private static class FakeProductRepository implements ProductRepository {

        private final Map<Long, Product> products = new HashMap<>();
        private long nextId = 1L;
        private int saveCalls;

        @Override
        public Product save(Product product) {
            saveCalls++;
            if (product.getId() == null) {
                product.setId(nextId++);
            }
            products.put(product.getId(), product);
            return product;
        }

        @Override
        public Optional<Product> findById(Long id) {
            return Optional.ofNullable(products.get(id));
        }

        @Override
        public List<Product> findAll() {
            return new ArrayList<>(products.values());
        }

        @Override
        public List<Product> findActive() {
            return products.values()
                    .stream()
                    .filter(product -> Boolean.TRUE.equals(product.getActive()))
                    .toList();
        }

        @Override
        public List<Product> findActiveByOrigin(ProductOrigin origin) {
            return products.values()
                    .stream()
                    .filter(product -> Boolean.TRUE.equals(product.getActive()))
                    .filter(product -> product.getOrigin() == origin)
                    .toList();
        }

        @Override
        public List<Product> findActiveByCategoryId(Long categoryId) {
            return products.values()
                    .stream()
                    .filter(product -> Boolean.TRUE.equals(product.getActive()))
                    .filter(product -> Objects.equals(product.getCategory().getId(), categoryId))
                    .toList();
        }

        @Override
        public boolean existsByNameIgnoreCase(String name) {
            return products.values()
                    .stream()
                    .anyMatch(product -> product.getName().equalsIgnoreCase(name));
        }

        @Override
        public boolean existsByNameIgnoreCaseAndIdNot(String name, Long id) {
            return products.values()
                    .stream()
                    .filter(product -> !Objects.equals(product.getId(), id))
                    .anyMatch(product -> product.getName().equalsIgnoreCase(name));
        }
    }

    private static class FakeProductCategoryRepository implements ProductCategoryRepository {

        private final Map<Long, ProductCategory> categories = new HashMap<>();
        private int findByIdCalls;

        @Override
        public ProductCategory save(ProductCategory category) {
            categories.put(category.getId(), category);
            return category;
        }

        @Override
        public Optional<ProductCategory> findById(Long id) {
            findByIdCalls++;
            return Optional.ofNullable(categories.get(id));
        }

        @Override
        public List<ProductCategory> findAll() {
            return new ArrayList<>(categories.values());
        }

        @Override
        public List<ProductCategory> findActive() {
            return categories.values()
                    .stream()
                    .filter(category -> Boolean.TRUE.equals(category.getActive()))
                    .toList();
        }

        @Override
        public boolean existsByNameIgnoreCase(String name) {
            return categories.values()
                    .stream()
                    .anyMatch(category -> category.getName().equalsIgnoreCase(name));
        }

        @Override
        public boolean existsByNameIgnoreCaseAndIdNot(String name, Long id) {
            return categories.values()
                    .stream()
                    .filter(category -> !Objects.equals(category.getId(), id))
                    .anyMatch(category -> category.getName().equalsIgnoreCase(name));
        }
    }

    private static class FakeSupplierRepository implements SupplierRepository {

        private final Map<Long, Supplier> suppliers = new HashMap<>();
        private int findByIdCalls;

        @Override
        public Supplier save(Supplier supplier) {
            suppliers.put(supplier.getId(), supplier);
            return supplier;
        }

        @Override
        public Optional<Supplier> findById(Long id) {
            findByIdCalls++;
            return Optional.ofNullable(suppliers.get(id));
        }

        @Override
        public List<Supplier> findAll() {
            return new ArrayList<>(suppliers.values());
        }

        @Override
        public List<Supplier> findActive() {
            return suppliers.values()
                    .stream()
                    .filter(supplier -> Boolean.TRUE.equals(supplier.getActive()))
                    .toList();
        }

        @Override
        public List<Supplier> findActiveBySupplierType(SupplierType supplierType) {
            return suppliers.values()
                    .stream()
                    .filter(supplier -> Boolean.TRUE.equals(supplier.getActive()))
                    .filter(supplier -> supplier.getSupplierType() == supplierType)
                    .toList();
        }

        @Override
        public boolean existsByNameIgnoreCase(String name) {
            return suppliers.values()
                    .stream()
                    .anyMatch(supplier -> supplier.getName().equalsIgnoreCase(name));
        }

        @Override
        public boolean existsByNameIgnoreCaseAndIdNot(String name, Long id) {
            return suppliers.values()
                    .stream()
                    .filter(supplier -> !Objects.equals(supplier.getId(), id))
                    .anyMatch(supplier -> supplier.getName().equalsIgnoreCase(name));
        }
    }
}