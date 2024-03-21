Feature: Event-Sourced Support Case Lifecycle Management

    Scenario: Initialize a new support case
        When a valid new support case is initialized (es)
        Then agent assignment is requested (es)
    
    Scenario: Assign an agent to a support case
        Given a valid new support case (es)
        When an agent is assigned (es)
        Then status changes to Open (es)
        And message is sent to the assigned agent (es)
    
    Scenario: Agent responds to a support case
        Given an assigned support case (es)
        When agent replies and changes the status to Pending (es)
        Then message is sent to the customer (es)
        And status changes to Pending (es)
    
    Scenario: Customer responds to an agent's message
        Given an assigned support case (es)
        And the agent replies and changes the status to Pending (es)
        When customer replies (es)
        Then message is sent to the agent (es)
        And status changes to Open (es)
