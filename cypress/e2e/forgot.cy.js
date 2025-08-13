describe('Forgot Password', () => {
  it('submits email and shows success message', () => {
    cy.intercept('POST', '**/auth/v1/recover', {
      statusCode: 200,
      body: {},
    }).as('recover');

    cy.visit('/forgot');
    cy.get('input[type="email"]').type('user@example.com');
    cy.get('button[type="submit"]').click();

    cy.wait('@recover');
    cy.contains('メールを送信しました').should('be.visible');
  });
});
