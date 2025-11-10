import { HttpStatus, Injectable } from "@nestjs/common";
import { ResponseDto } from "./response.dto";

@Injectable()
export class ResponseService {
  postResponse(id: string): ResponseDto {
    return {
      success: true,
      message: "Record created successfully",
      object: { id },
      errors: undefined,
    };
  }

  updateResponse(id: string): ResponseDto {
    return {
      success: true,
      message: "Record updated successfully",
      object: { id },
      errors: undefined,
    };
  }

  deleteResponse(): ResponseDto {
    return {
      success: true,
      message: "Record deleted successfully",
      object: null,
      errors: undefined,
    };
  }

  fetchResponse(data: any): ResponseDto {
    return {
      success: true,
      message: "Resource retrieved successfully",
      object: data,
      errors: undefined,
    };
  }

  customRespose(message: string, status: HttpStatus, data?: any): ResponseDto {
    return {
      success: status >= 200 && status < 300,
      message,
      object: data || null,
      errors: undefined,
    };
  }
}
