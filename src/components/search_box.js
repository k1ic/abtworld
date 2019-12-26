import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import get from 'lodash/get';

import { withRouter } from 'react-router-dom';
import IconFa from '@arcblock/ux/lib/Icon';
import AsyncComponent from '@arcblock/ux/lib/Async';

import forge from '../libs/forge';
import { getExplorerUrl } from '../libs/util';

const AsyncSelect = AsyncComponent(() => import('react-select/lib/Async'));

class SearchBox extends React.Component {
  state = {
    loading: false,
  };

  placeholder = 'Search block/transaction/account/swap/delegation';

  render() {
    const { history, ...rest } = this.props;
    return (
      <Container {...rest}>
        <AsyncSelect
          cacheOptions
          isLoading={this.state.loading}
          className="react-select-container"
          classNamePrefix="react-select"
          noOptionsMessage={this.noOptionsMessage}
          placeholder="Search block/transaction/account/swap/delegation"
          loadOptions={this.doSearch}
          onChange={this.onSelectSearch}
        />
        <IconFa name="search" size={18} className="search-icon" />
      </Container>
    );
  }

  // prettier-ignore
  noOptionsMessage = ({ inputValue }) => (inputValue ? 'Oops, nothing match found' : this.placeholder);

  onSelectSearch = ({ value }, { action }) => {
    if (action === 'select-option' && value) {
      this.props.history.push(value);
    }
  };

  doSearch = async keyword => {
    const possibleTypes = {
      tx: {
        query: `{ getTx(hash: "${keyword}") { info { hash } } }`,
        label: v => `Transaction: ${v}`,
        value: v => getExplorerUrl(`/txs/${v}`),
        path: 'getTx.info.hash',
      },
      block: {
        query: `{ getBlock(height: ${keyword}) { block { height } } }`,
        label: v => `Block: ${v}`,
        value: v => getExplorerUrl(`/blocks/${v}`),
        path: 'getBlock.block.height',
      },
      account: {
        query: `{ getAccountState(address: "${keyword}") { state { address } } }`,
        label: v => `Account: ${v}`,
        value: v => getExplorerUrl(`/accounts/${v}`),
        path: 'getAccountState.state.address',
      },
      asset: {
        query: `{ getAssetState(address: "${keyword}") { state { address } } }`,
        label: v => `Asset: ${v}`,
        value: v => getExplorerUrl(`/assets/${v}`),
        path: 'getAssetState.state.address',
      },
      swap: {
        query: `{ getSwapState(address: "${keyword}") { state { address } } }`,
        label: v => `Swap: ${v}`,
        value: v => getExplorerUrl(`/swap/${v}`),
        path: 'getSwapState.state.address',
      },
      delegate: {
        query: `{ getDelegateState(address: "${keyword}") { state { address } } }`,
        label: v => `Delegation: ${v}`,
        value: v => getExplorerUrl(`/delegate/${v}`),
        path: 'getDelegateState.state.address',
      },
      contract: {
        query: `{ getProtocolState(address: "${keyword}") { state { address } } }`,
        label: v => `Smart Contract: ${v}`,
        value: v => getExplorerUrl(`/contracts/${v}`),
        path: 'getProtocolState.state.address',
      },
    };

    this.setState({ loading: true });
    const options = [];
    const keys = Object.keys(possibleTypes);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // eslint-disable-next-line
      await this.loadSuggest(key, possibleTypes[key], options);
    }

    this.setState({ loading: false });
    return options;
  };

  loadSuggest = async (type, spec, options) => {
    try {
      const { query, label, value, path } = spec;
      const res = await forge().doRawQuery(query);
      const v = get(res, path);

      if (v) {
        options.push({ value: value(v), label: label(v) });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(type, err);
      }
    }
  };
}

SearchBox.propTypes = {
  history: PropTypes.object.isRequired,
};

const Container = styled.div`
  flex-grow: 1;
  flex-shrink: 0;
  margin-left: 20px;
  position: relative;
  max-width: 480px;

  .search-icon {
    position: absolute;
    right: 16px;
    top: 8px;
  }

  .react-select__control {
    border-radius: 20px;
    padding-left: 8px;
    background-color: ${props => props.theme.palette.background.default};
    .react-select__indicators {
      display: none;
    }
    .react-select__placeholder {
      color: ${props => props.theme.typography.color.gray};
    }
    .react-select__input,
    .react-select__single-value {
      color: ${props => props.theme.typography.color.main};
    }
  }

  .react-select__control--is-focused {
    border-color: ${props => props.theme.typography.color.main};
    box-shadow: 0 0 0 0 transparent;

    &:hover {
      border-color: ${props => props.theme.typography.color.main};
    }
  }

  .react-select__menu {
    background-color: ${props => props.theme.palette.background.default};
    color: ${props => props.theme.typography.color.main};
    text-align: left;

    .react-select__option,
    .react-select__option--is-disabled {
      text-align: left;
    }

    .react-select__option--is-focused,
    .react-select__control--is-selected {
      background-color: ${props => props.theme.palette.primary.main};
    }
  }
`;

export default withRouter(SearchBox);
