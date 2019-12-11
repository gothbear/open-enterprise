import PropTypes from 'prop-types'
import React from 'react'
import { useAragonApi } from '../../api-react'
import {
  DropDown,
  Field,
  Info,
  Text,
  TextInput,
  useTheme
} from '@aragon/ui'
import styled from 'styled-components'

import { Form } from '../Form'
import { isStringEmpty } from '../../utils/helpers'
import { BigNumber } from 'bignumber.js'
import { ETH_DECIMALS, MIN_AMOUNT } from '../../utils/constants'
import CurrencyBox from '../Form/Field/CurrencyBox'

// TODO:: This should be votingTokens from account?
const INITIAL_STATE = {
  name: '',
  nameError: true,
  amount: '',
  amountError: true,
  buttonText: 'Create budget',
  selectedToken: 0
}

class NewBudget extends React.Component {
  static propTypes = {
    period: PropTypes.number.isRequired,
    saveBudget: PropTypes.func.isRequired,
    editingBudget: PropTypes.object,
    tokens: PropTypes.array,
    theme: PropTypes.object.isRequired,
  }

  static defaultProps = {
    editingBudget: {},
  }

  constructor(props) {
    super(props)
    this.state = { ...INITIAL_STATE }
    if (props.editingBudget.id) {
      this.state.name = props.editingBudget.name
      this.state.nameError = false
      this.state.amount = BigNumber(props.editingBudget.amount)
        .div(ETH_DECIMALS)
      this.state.amountError = false
      this.state.buttonText = 'Submit'
    }
  }

  changeField = e => {
    const { name, value } = e.target
    this.setState({
      [name]: value,
      [name + 'Error']: isStringEmpty(value)
    })
    if (name === 'amount') {
      const numericValue = BigNumber(value)
      this.setState({
        amountError: numericValue.lt(MIN_AMOUNT),
      })
    }
  }

  createBudget = () => {
    const { name, amount, selectedToken } = this.state
    const token = this.props.tokens[selectedToken]
    const amountWithDecimals = BigNumber(amount).times(BigNumber(10).pow(token.decimals)).toString(10)
    this.props.saveBudget({ id: this.props.editingBudget.id, name, amount: amountWithDecimals, token })
  }

  handleSelectToken = index => {
    this.setState({ selectedToken: index })
  }

  render() {
    const {
      name,
      nameError,
      amount,
      amountError,
      selectedToken,
      buttonText
    } = this.state

    const symbols = this.props.tokens.map(({ symbol }) => symbol)

    return (
      <Form
        onSubmit={this.createBudget}
        submitText={buttonText}
        disabled={name === '' || amount === '' || nameError || amountError}
        errors={
          <ErrorContainer>
            { this.props.editingBudget.id ? (
              <Info>
                Please keep in mind that any changes to the budget amount may only be effectuated upon the starting date of the next accounting period.
              </Info>
            ) : (
              <Info>
                Budgets represent a spending limit that is imposed upon an allocation category for the accounting period. Budgets do not hold any actual funds.
              </Info>
            )}
          </ErrorContainer>
        }
      >
        <Field
          required
          label="name">
          <TextInput
            name="name"
            onChange={this.changeField}
            wide={true}
            value={name}
          />
        </Field>
        <Field
          required
          label="amount">
          <InputGroup>
            <TextInput
              name="amount"
              type="number"
              min={0}
              onChange={this.changeField}
              step="any"
              value={amount}
              css={{ borderRadius: '4px 0 0 4px' }}
              required
              wide
            />
            {this.props.editingBudget.id ? (
              <CurrencyBox>{this.props.editingBudget.token.symbol}</CurrencyBox>
            ) : (
              <DropDown
                name="token"
                css={{ borderRadius: '0 4px 4px 0', left: '-1px' }}
                items={symbols}
                selected={selectedToken}
                onChange={this.handleSelectToken}
              />
            )}
            <Text
              css={`
                white-space: nowrap;
                line-height: 40px;
                padding-left: 16px;
                font-size: 16px;
                color: ${this.props.theme.contentSecondary};
              `}
            >
              every {timeString(this.props.period)}
            </Text>
          </InputGroup>
        </Field>
      </Form>
    )
  }
}

const timeString = seconds => {
  const days = seconds/86400
  if(days%365 === 0){
    const years = days/365
    return `${years === 1 ? 'year' : `${years} years`}`
  }
  if(days%7 === 0){
    const weeks = days/7
    return `${weeks === 1 ? 'week' : `${weeks} weeks`}`
  }
  return `${days === 1 ? 'day' : `${days} days`}`
}

const NewBudgetWrap = props => {
  const { appState: { tokens = [] } } = useAragonApi()
  const theme = useTheme()
  return <NewBudget tokens={tokens} theme={theme} {...props} />
}

const InputGroup = styled.div`
  display: flex;
`

const ErrorContainer = styled.div``

// eslint-disable-next-line import/no-unused-modules
export default NewBudgetWrap
