import {
  DomainConflictException,
  DomainForbiddenException,
  DomainNotFoundException,
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('DomainException classes', () => {
  it('should instantiate InvalidArgumentException with default message', () => {
    const error = new InvalidArgumentException();
    expect(error.message).toBe('Invalid Argument');
    expect(error.name).toBe('InvalidArgumentException');
    expect(error.errors).toBeUndefined();
  });

  it('should instantiate DomainForbiddenException with default message', () => {
    const error = new DomainForbiddenException();
    expect(error.message).toBe('Forbidden');
    expect(error.name).toBe('DomainForbiddenException');
    expect(error.errors).toBeUndefined();
  });

  it('should instantiate DomainNotFoundException with default message', () => {
    const error = new DomainNotFoundException();
    expect(error.message).toBe('Not Found');
    expect(error.name).toBe('DomainNotFoundException');
    expect(error.errors).toBeUndefined();
  });

  it('should instantiate DomainConflictException with default message', () => {
    const error = new DomainConflictException();
    expect(error.message).toBe('Conflict');
    expect(error.name).toBe('DomainConflictException');
    expect(error.errors).toBeUndefined();
  });

  it('should instantiate DomainUnauthorizedException with default message', () => {
    const error = new DomainUnauthorizedException();
    expect(error.message).toBe('Unauthorized');
    expect(error.name).toBe('DomainUnauthorizedException');
    expect(error.errors).toBeUndefined();
  });

  it('should preserve errors dictionary when instantiated directly', () => {
    const errors = { field: 'is invalid' };
    const error = new InvalidArgumentException('My error', errors);
    expect(error.errors).toEqual(errors);
  });

  it('should construct conflict and unauthorized exceptions directly', () => {
    const conflict = new DomainConflictException('Already exists');
    expect(conflict).toBeInstanceOf(DomainConflictException);
    expect(conflict.message).toBe('Already exists');

    const unauthorized = new DomainUnauthorizedException('No permission');
    expect(unauthorized).toBeInstanceOf(DomainUnauthorizedException);
    expect(unauthorized.message).toBe('No permission');
  });
});
