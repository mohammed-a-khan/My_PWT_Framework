@ado-integration @TestPlanId:417 @TestSuiteId:418
Feature: Data-Driven Test with ADO Integration
  Demonstrates data-driven test handling with multiple iterations for a single test case

  Background:
    Given I navigate to the Orange HRM application

  @TestCaseId:419 @data-driven
  Scenario Outline: Login with CSV Examples configuration
    When I enter username "<username>" and password "<password>"
    And I click on the Login button
    Then I should see login result as "<expectedResult>"

    Examples: {"type": "csv", "source": "test/orangehrm/data/users.csv"}