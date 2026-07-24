import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import type {
  AsyncStorageModuleOptions,
  StorageModuleOptions,
  StorageOptionsFactory,
} from './interfaces';
import { STORAGE_MODULE_OPTIONS } from './constants';
import { StorageService } from 'src/storage.service';

@Global()
@Module({})
export class StorageModule {
  static forRoot(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_MODULE_OPTIONS,
          useValue: options,
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }

  static forRootAsync(options: AsyncStorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      imports: options.imports,
      providers: [...this.createAsyncProviders(options), StorageService],
      exports: [StorageService],
    };
  }

  private static createAsyncProviders(
    options: AsyncStorageModuleOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: AsyncStorageModuleOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: STORAGE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: STORAGE_MODULE_OPTIONS,
      useFactory: (optionsFactory: StorageOptionsFactory) =>
        optionsFactory.createStorageOptions(),
      inject: [options.useClass!],
    };
  }
}
