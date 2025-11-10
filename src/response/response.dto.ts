export class ResponseDto {
  success: boolean;
  message: string;
  object?: any;
  errors?: string[];
}

export class PaginatedResponseDto {
  success: boolean;
  message: string;
  object: any[];
  pageNumber: number;
  pageSize: number;
  totalSize: number;
  totalPages?: number;
  errors?: string[];
}
