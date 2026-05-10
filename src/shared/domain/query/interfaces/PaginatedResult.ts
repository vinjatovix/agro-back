export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}
