Feature: Support Case Lifecycle Management

    Scenario: Initialize a new support case
        When a valid new support case is initialized
        Then agent assignment is requested
    
    Scenario: Assign an agent to a support case
        Given a valid new support case
        When an agent is assigned
        Then status changes to Open
        And message is sent to the assigned agent
    
    Scenario: Agent responds to a support case
        Given an assigned support case
        When agent replies and changes the status to Pending
        Then message is sent to the customer
        And status changes to Pending
    
    Scenario: Customer responds to an agent's message
        Given an assigned support case
        And the agent replies and changes the status to Pending
        When customer replies
        Then message is sent to the agent
        And status changes to Open
