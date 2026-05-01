Feature: Api Health Check
  In order to verify the application's availability
  As a health check client
  I want check the API status

  Scenario: Performing a health check
    Given a GET request to "/api/v1/health"
    Then the response status code should be 200
    Then the response body should contain
      """
      {
        "status": "OK"
      }
      """
    And response matches OpenAPI contract


  Scenario: Performing a health check with wrong route
    Given a GET request to "/api/v1/whatever"
    Then the response status code should be 404

  Scenario: Performing a error check
    Given a GET request to "/api/v1/error"
    Then the response status code should be 418
    Then the response body should be
      """
      {
        "message": "Forced error for testing"
      }
      """