import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('test', async ({ page }) => {
  // Login using the auth helper (reads from XPORTAL_EMAIL and XPORTAL_PASSWORD)
  await login(page);

  await page.getByRole('link', { name: 'Applications' }).nth(1).click();
  await page.getByRole('link', { name: 'New Application' }).click();
  await page.getByRole('textbox', { name: 'Salutation' }).click();
  await page.getByRole('textbox', { name: 'Salutation' }).fill('Mr');
  await page.getByRole('textbox', { name: 'First name *' }).click();
  await page.getByRole('textbox', { name: 'First name *' }).fill('Shashwat');
  await page.getByRole('textbox', { name: 'Middle name' }).click();
  await page.getByRole('textbox', { name: 'Middle name' }).fill('Yagnesh');
  await page.getByRole('textbox', { name: 'Last name *' }).click();
  await page.getByRole('textbox', { name: 'Last name *' }).fill('Suthar');
  await page.getByRole('textbox', { name: 'Preferred name' }).click();
  await page.getByRole('textbox', { name: 'Preferred name' }).fill('Shash');
  await page.getByRole('textbox', { name: 'Date of birth *' }).click();
  await page
    .getByRole('textbox', { name: 'Date of birth *' })
    .fill('14/02/2005');
  await page.getByRole('textbox', { name: 'Email *' }).click();
  await page
    .getByRole('textbox', { name: 'Email *' })
    .fill('shshwtsuthar@gmail.com');
  await page.getByRole('textbox', { name: 'Work phone' }).click();
  await page.getByRole('textbox', { name: 'Work phone' }).fill('0405570285');
  await page.getByRole('textbox', { name: 'Mobile phone *' }).click();
  await page
    .getByRole('textbox', { name: 'Mobile phone *' })
    .fill('0405570285');
  await page.getByRole('textbox', { name: 'Alternative email' }).click();
  await page
    .getByRole('textbox', { name: 'Alternative email' })
    .fill('shashwatsuthar1422005@gmail.com');
  await page
    .getByRole('button', { name: 'Search and autofill address' })
    .click();
  await page
    .getByRole('combobox', { name: 'Address search input' })
    .fill('5 crusade st');
  await page.getByText('5 Crusade Street, Tarneit VIC').click();
  await page.getByRole('textbox', { name: 'Emergency contact name' }).click();
  await page
    .getByRole('textbox', { name: 'Emergency contact name' })
    .fill('Jane Smith');
  await page.getByRole('textbox', { name: 'Relationship' }).click();
  await page.getByRole('textbox', { name: 'Relationship' }).fill('Mother');
  await page.getByRole('textbox', { name: 'Phone number' }).click();
  await page.getByRole('textbox', { name: 'Phone number' }).fill('0405570285');
  await page.getByRole('textbox', { name: 'Guardian name' }).click();
  await page.getByRole('textbox', { name: 'Guardian name' }).fill('John Smith');
  await page.getByRole('textbox', { name: 'Guardian email' }).click();
  await page
    .getByRole('textbox', { name: 'Guardian email' })
    .fill('guardian@example.com');
  await page.getByRole('textbox', { name: 'Guardian phone' }).click();
  await page
    .getByRole('textbox', { name: 'Guardian phone' })
    .fill('0405570285');
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Go to AVETMISS' }).click();
  await page.getByText('Gender *SelectIndigenous').click();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Neither' }).click();
  await page.getByRole('combobox').filter({ hasText: 'Australia' }).click();
  await page.getByRole('option', { name: 'India', exact: true }).click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select language' })
    .click();
  await page.getByRole('option', { name: 'Gujarati' }).click();
  await page.getByRole('combobox').nth(4).click();
  await page.getByRole('option', { name: 'International (visa)' }).click();
  await page.getByRole('combobox').nth(5).click();
  await page.getByText('Year 12 or equivalent').click();
  await page.getByRole('combobox').filter({ hasText: 'Select year' }).click();
  await page.getByRole('option', { name: '2023' }).click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select' })
    .first()
    .click();
  await page.getByRole('option', { name: 'No' }).click();
  await page
    .getByRole('combobox')
    .filter({ hasText: /^Select$/ })
    .click();
  await page.getByRole('option', { name: 'Part-time', exact: true }).click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select exemption (optional)' })
    .click();
  await page.getByText('INDIV - Individual Exemption').click();
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Go to CRICOS' }).click();
  await page.getByRole('textbox', { name: 'Passport number *' }).click();
  await page
    .getByRole('textbox', { name: 'Passport number *' })
    .fill('E123456');
  await page.getByRole('textbox', { name: 'Passport issue date' }).click();
  await page
    .getByRole('textbox', { name: 'Passport issue date' })
    .fill('14/02/2023');
  await page.getByRole('textbox', { name: 'Passport expiry date' }).click();
  await page
    .getByRole('textbox', { name: 'Passport expiry date' })
    .fill('14/02/2027');
  await page.getByRole('textbox', { name: 'Place of birth' }).click();
  await page.getByRole('textbox', { name: 'Place of birth' }).fill('Baroda');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'India', exact: true }).click();
  await page.getByText('Visa InformationHolds').click();
  await page.getByText('Visa InformationHolds').click();
  await page.getByText('Holds Australian visa').click();
  await page.getByRole('textbox', { name: 'Visa type' }).click();
  await page.getByRole('textbox', { name: 'Visa type' }).fill('Student');
  await page.getByText('Visa typeVisa number *').click();
  await page.getByRole('textbox', { name: 'Visa number *' }).click();
  await page.getByRole('textbox', { name: 'Visa number *' }).fill('0123ABC');
  await page
    .getByRole('textbox', { name: 'Department of Home Affairs' })
    .click();
  await page
    .getByRole('textbox', { name: 'Department of Home Affairs' })
    .fill('Sydney');
  await page.getByText('Provider Arranged OSHC? *').click();
  await page.getByText('OSHC Provider Name *').click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select OSHC provider' })
    .click();
  await page.getByRole('option', { name: 'BUPA' }).click();
  await page.getByRole('textbox', { name: 'OSHC Start Date *' }).click();
  await page
    .getByRole('textbox', { name: 'OSHC Start Date *' })
    .fill('14/02/2023');
  await page.getByRole('textbox', { name: 'OSHC End Date *' }).click();
  await page
    .getByRole('textbox', { name: 'OSHC End Date *' })
    .fill('14/02/2027');
  await page.getByText('Has student undertaken').click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select test type' })
    .click();
  await page.getByRole('option', { name: 'IELTS' }).click();
  await page.getByRole('textbox', { name: 'Test Score *' }).click();
  await page.getByRole('textbox', { name: 'Test Score *' }).fill('8.5');
  await page.getByRole('textbox', { name: 'Test Date' }).click();
  await page.getByRole('textbox', { name: 'Test Date' }).fill('14/02/2025');
  await page.getByText('Has student previously').click();
  await page.getByRole('textbox', { name: 'Previous Provider Name *' }).click();
  await page
    .getByRole('textbox', { name: 'Previous Provider Name *' })
    .fill('Deakin University');
  await page.getByRole('combobox').nth(3).click();
  await page.getByRole('option', { name: 'Yes' }).press('Enter');
  await page.getByRole('combobox').filter({ hasText: 'Select' }).click();
  await page.getByRole('option', { name: 'Yes' }).click();
  await page.getByRole('combobox').nth(3).click();
  await page.getByRole('option', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Go to Additional Info' }).click();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'No', exact: true }).click();
  await page.getByRole('combobox').filter({ hasText: 'Not Stated' }).click();
  await page.getByRole('option', { name: 'Yes' }).click();
  await page
    .getByRole('checkbox', { name: 'Bachelor degree or higher' })
    .click();
  await page.getByRole('checkbox', { name: 'Australian', exact: true }).click();
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Go to Enrollment' }).click();
  await page
    .getByRole('combobox')
    .filter({ hasText: /^Select a program$/ })
    .click();
  await page.getByText('Certificate III in Carpentry').click();
  await page
    .getByRole('combobox')
    .filter({ hasText: /^Select a location$/ })
    .click();
  await page.getByText('Geelong Main Campus').click();
  await page
    .getByRole('combobox')
    .filter({ hasText: /^Select a group$/ })
    .click();
  await page.getByText('Carpentry Group 1').click();
  await page
    .getByRole('combobox')
    .filter({ hasText: 'Select a timetable' })
    .click();
  await page.getByText('Certificate III in Carpentry: 2025 -').click();
  await page.getByRole('button', { name: 'Pick commencement date' }).click();
  await page.getByRole('button', { name: 'Monday, January 26th,' }).click();
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Go to Payment' }).click();
  await page.getByRole('button', { name: 'Pick a date' }).click();
  await page.getByRole('button', { name: 'Monday, January 26th,' }).click();
  await page.getByRole('button', { name: 'Save Draft Ctrl S' }).nth(1).click();
  await page.getByRole('button', { name: 'Submit Application' }).click();
});
